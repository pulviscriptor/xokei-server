var Logger = require('../../logger');
var GameEmulator = require('./game.emulator');

function Anticheat(game, player) {
	this.real_game = game;
	this.real_room = game.room;

	this.player = player;

	this.game_emulator = new GameEmulator(this);
	this.board_emulator = this.game_emulator.board_emulator;
}

Anticheat.prototype = {
	checkTurn: function (turn) {
		for(var i=0;i<turn.history.length;i++) {
			this.emulateMove(turn.history[i]);
		}
	},

	emulateMove: function (move) {
		if(move.type == 'Begin round') {
			this.expectState(this.game_emulator.STATES.GAME_STARTED);
			if(this.board_emulator.puck) throw new Error('Attempted to begin round with puck already placed');

			move.execute(this.game_emulator);
		}else if(move.type == 'place puck') {
			this.expectState(this.game_emulator.STATES.PLACING_PUCK);
			if(this.board_emulator.puck) throw new Error('Attempted to place puck with puck already placed');
			if(!move.finish) throw new Error('move.finish is missing');

			var tile = this.validTile(move.finish);

			if(!tile.inZone(this.player, 'territory')) throw new Error('Attempted to place puck on wrong territory: ' + tile);
			if(tile.actor) throw new Error('There is already actor in tile ' + tile + ' and it is ' + tile.actor);

			move.execute(this.game_emulator, this.board_emulator);
		}else if(move.type == 'actor') {
			this.expectState(this.game_emulator.STATES.PLAYING_ROUND);
			if(!move.start) throw new Error('move.start is missing');
			if(!move.finish) throw new Error('move.finish is missing');

			// check if start end finish tiles exists
			var tile_start = this.validTile(move.start);
			var tile_finish = this.validTile(move.finish);
			if(!tile_start) throw new Error('Failed to find start tile: ' + move.start.x + ',' + move.start.y);
			if(!tile_finish) throw new Error('Failed to find finish tile: ' + move.finish.x + ',' + move.finish.y);

			// check if distance is 1 tile away
			if(Math.abs(tile_start.x-tile_finish.x) > 1 || Math.abs(tile_start.y-tile_finish.y) > 1) {
				throw new Error('Attempted to move actor more than 2 tiles: from ' + tile_start + ' to ' + tile_finish);
			}

			// check actors on tiles
			var actor_start = tile_start.actor;
			var actor_finish = tile_finish.actor;
			if(!actor_start) throw new Error('There is no actor at start tile ' + tile_start);
			if(actor_finish) throw new Error('There is actor already at finish tile ' + tile_finish);
			if(actor_start.type != 'player') throw new Error('actor at start tile has type ' + actor_start.type + ', expected player');
			if(actor_start.owner != this.player) throw new Error(this.player + ' attempted to move actor from ' + tile_start + ' but owner of that actor is ' + actor_start.owner);

			// make sure actors will not block important zones
			// "goal" zone should have max 1 player actor in it
			// "endZone" zone should have max 2 players in it
			var tileIn_goal = (tile_finish.zones.indexOf('goal') >= 0);
			var tileIn_endZone = (tile_finish.zones.indexOf('endZone') >= 0);

			if( tileIn_goal || tileIn_endZone ) {
				if (tileIn_goal) {
					var zone = (tile_finish.zones.indexOf('player1_goal') >= 0) ? 'player1_goal' : 'player2_goal';
				} else if (tileIn_endZone) {
					zone = (tile_finish.zones.indexOf('player1_endZone') >= 0) ? 'player1_endZone' : 'player2_endZone';
				}
				var actorsInZone = this.getActorsInZone(zone, tile_start);

				if(tileIn_goal && actorsInZone.length >= 1) throw new Error('Attempted to move actor from ' +
					tile_start + ' to ' + tile_finish + ' but in "' + zone + '" already 1 or more actors in: ' + actorsInZone);

				if(tileIn_endZone && actorsInZone.length >= 2) throw new Error('Attempted to move actor from ' +
					tile_start + ' to ' + tile_finish + ' but in "' + zone + '"  already 2 or more actors in: ' + actorsInZone);
			}

			move.execute(this.game_emulator, this.board_emulator);
		}else if(move.type == 'puck') {
			this.expectState(this.game_emulator.STATES.PLAYING_ROUND);
			if(!move.start) throw new Error('move.start is missing');
			if(!move.finish) throw new Error('move.finish is missing');
			if(!move.trajectory) throw new Error('move.trajectory is missing');

			// check if start end finish tiles exists
			tile_start = this.validTile(move.start);
			tile_finish = this.validTile(move.finish);
			if(!tile_start) throw new Error('Failed to find start tile: ' + move.start.x + ',' + move.start.y);
			if(!tile_finish) throw new Error('Failed to find finish tile: ' + move.finish.x + ',' + move.finish.y);

			// is there puck on start tile?
			if(!tile_start.actor || tile_start.actor.type != 'puck') {
				throw new Error('No puck in start tile: ' + tile_start + ', actor=' + tile_start.actor);
			}

			// checking trajectory tiles
			// checking if player's "finish" tile is inside trajectory
			var finishInsideTrajectory = false;
			for(var i=0;i<move.trajectory.length;i++) {
				tile = this.board_emulator.tiles[move.trajectory[i].x][move.trajectory[i].y];
				if(!tile) throw new Error('There is non-existing tile (' + JSON.stringify(move.trajectory[i]) + ') ' +
					'in trajectory that client sent. Full dump client\'s trajectory: ' + JSON.stringify(move.trajectory));

				if(tile.x == tile_finish.x && tile.y == tile_finish.y) {
					finishInsideTrajectory = true;
				}
			}
			if(!finishInsideTrajectory) {
				throw new Error('Finish tile ' + tile_finish + ' not found inside trajectory ' + JSON.stringify(move.trajectory));
			}

			// checking if direction tile (first tile of trajectory) is 1 tile away
			var direction = move.trajectory[0];
			if(Math.abs(move.start.x - direction.x) > 1 || Math.abs(move.start.y - direction.y) > 1) {
				throw new Error('First tile in trajectory is more than 1 tile away: start=' + move.start.x + ',' + move.start.y + ' trajectory[0]=' + direction.x + ',' + direction.y);
			}

			// calculating trajectory based on direction
			var calculatedTrajectory = this.calculatePuckTrajectory(move.start, direction);

			// checking player's trajectory with generated trajectory
			for(i=0;i<move.trajectory.length;i++) {
				var client_tile = move.trajectory[i];
				var calculated_tile = calculatedTrajectory[i];

				if(client_tile.x != calculated_tile.x || client_tile.y != calculated_tile.y) {
					throw new Error('Trajectory mismatch at tile=' + i + '! Player sent: ' + JSON.stringify(move.trajectory) + ' but server calculated ' + JSON.stringify(calculatedTrajectory));
				}
			}

			// check if goal was made and if client says same goal state
			var scored = tile_finish.inZone('goal') ? (tile_finish.inZone('player1', 'goal') ? 'player2' : 'player1') : false;
			if(scored != (move.scored.side || false)) {
				throw new Error('Client sent scored=' + move.scored.side + ' but anticheat calculated scored=' + scored);
			}

			// finally execute move
			move.execute(this.game_emulator, this.board_emulator);
		}else{
			throw new Error('Unknown move type: ' + move.type);
		}
	},

	expectState: function (state) {
		if(this.game_emulator.state != state) throw new Error('Expected game_emulator.state to be "' + state + '" but it is "' + this.game_emulator.state + '"');
	},

	validTile: function (obj) {
		if(typeof obj.x != 'number') throw new Error('obj.x is not a number: ' + obj.x);
		if(typeof obj.y != 'number') throw new Error('obj.y is not a number: ' + obj.y);

		var tile = this.board_emulator.tile(obj.x,obj.y);
		if(!tile) throw new Error('There is no tile at ' + obj.x + ',' + obj.y);

		return tile;
	},

	getActorsInZone: function (zone, excludeTile) {
		var ret = [];
		for(var x in this.board_emulator.tiles) {
			for(var y in this.board_emulator.tiles[x]) {
				if(excludeTile && x == excludeTile.x && y == excludeTile.y) continue;
				var tile = this.board_emulator.tiles[x][y];
				if(!tile) continue;
				if(!tile.actor) continue;
				if(tile.actor.type != 'player') continue;
				if(tile.zones.indexOf(zone) >= 0) ret.push(tile);
			}
		}
		return ret;
	},

	// this code is ported from client's "puck.js"
	calculatePuckTrajectory: function (start, direction) {
		var crossedBorder = false,
			dx = direction.x - start.x,
			dy = direction.y - start.y,
			lastTile = this.board_emulator.tile(start.x, start.y),
			reflectX,
			reflectY,
			tile,
			trajectory = [],
			x = start.x,
			y = start.y;

		while (1) {
			if (tile) {
				lastTile = tile;
			}

			x += dx;
			y += dy;

			tile = this.board_emulator.tile(x, y);

			if (!tile) {
				// check if this is an orthagonal collision, in which case the
				// path of the puck needs to end here
				if (dx * dy === 0) {
					break;
				}

				// we must disallow puck to bounce off corners of goal zones
				// so we need to check if this wall is below or above goal zone
				var tile_dy = this.board_emulator.tile(x, y - dy);
				if(tile_dy && tile_dy.zones.indexOf('goal') >= 0) {
					break;
				}

				reflectX = x <= 1 || x >= 13;
				reflectY = y === 8 || y === -1;

				// we know that this is a diagonal collision, so we need to
				// reverse the direction and allow the puck to continue
				if (reflectY) {
					x -= dx;
					y -= dy;

					dy *= -1;
				}

				if (reflectX && !reflectY) {
					x -= dx;
					y -= dy;

					dx *= -1;
				}

				continue;
			}
			// check if the owner of this tile does not equal the owner of the
			// original tile, which would indicate that the puck has crossed the
			// border at some point
			if (tile.owner !== lastTile.owner) {
				if (crossedBorder) {
					// if the tile has already crossed the border, then the next
					// tile represents a second crossing of the border, which we
					// won't allow
					break;
				} else {
					// however, if this is the first time crossing the border,
					// then we let the puck continue on its way
					crossedBorder = true;
				}
			}

			// if the tile is occupied by an actor, end the loop
			if (tile.actor) {
				break;
			}

			if (tile) {
				trajectory.push({x: tile.x, y: tile.y});
			}

			// if this tile is a goal, then break the loop
			if (tile.inZone("goal")) {
				break;
			}
		}

		return trajectory;
	}
};

module.exports = Anticheat;