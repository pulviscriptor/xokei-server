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
		var last = turn.history[turn.history.length-1];
		if(!last.scored && turn.history.length != 2) {
			throw new Error('Sent scored=false but there is ' + turn.history.length + ' moves in turn');
		}
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

			if(tile.inZone('goal')) throw new Error('Attempted to place puck in goal zone: ' + tile);
			if(tile.inZone('endZone')) throw new Error('Attempted to place puck in endZone: ' + tile);
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

			//todo re-write this mess
			if( tileIn_goal || tileIn_endZone ) {
				if (tileIn_goal) {
					// opponent can't move inside goal zone at all
					if(tile_finish.zones.indexOf(this.player.opponent.side + '_goal') >= 0) {
						throw new Error('Attempted to move to opponent\'s goal zone at ' + tile_finish);
					}

					var zone = (tile_finish.zones.indexOf('player1_goal') >= 0) ? 'player1_goal' : 'player2_goal';
					var actorsInZone = this.getActorsInZone(zone, tile_start);

					if(actorsInZone.length >= 1) throw new Error('Attempted to move actor from ' +
						tile_start + ' to ' + tile_finish + ' but in "' + zone + '" already 1 or more actors in: ' + actorsInZone);

				// do check only if owner of endZone trying to put his 3 actors there. Opponent can put all his actors to opponent's endZone
				} else if (tileIn_endZone && tile_finish.owner == tile_start.actor.owner.side) {
					zone = (tile_finish.zones.indexOf('player1_endZone') >= 0) ? 'player1_endZone' : 'player2_endZone';
					// count only owner's actors in endZone
					actorsInZone = this.getActorsInZone(zone, tile_start, tile_finish.owner);

					if(actorsInZone.length >= 2) throw new Error('Attempted to move actor from ' +
						tile_start + ' to ' + tile_finish + ' but in "' + zone + '" already 2 or more actors in: ' + actorsInZone);
				}
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

			// calculate valid kick directions and check if player sent valid direction
			var kickDirections = this.calculateKickDirections(tile_start, this.player);
			var directionTile = this.validTile(direction);
			if(kickDirections.blockedByPlayers) throw new Error('Attempted to kick puck but its blocked by players');
			if(kickDirections.noOwnerNearPuck) throw new Error('Attempted to kick puck but there is no player near it');
			var validKickDirection = kickDirections.directions.find(function (el) {
				if(el.x == directionTile.x && el.y == directionTile.y) return el;
			});
			if(!validKickDirection) throw new Error('Attempted to kick puck but ' + tile_start + '->' + directionTile + ' is not valid direction');

			// calculating trajectory based on direction
			var calculatedTrajectory = this.calculatePuckTrajectory(move.start, direction);

			// checking player's trajectory with generated trajectory
			for(i=0;i<move.trajectory.length;i++) {
				var client_tile = move.trajectory[i];
				var calculated_tile = calculatedTrajectory[i];
				if(!calculated_tile) throw new Error('Received more tiles in trajectory than anticheat calculated: ' + JSON.stringify(move.trajectory) + ' vs ' + JSON.stringify(calculatedTrajectory));

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

	getActorsInZone: function (zone, excludeTile, side) {
		var ret = [];
		for(var x in this.board_emulator.tiles) {
			for(var y in this.board_emulator.tiles[x]) {
				if(excludeTile && x == excludeTile.x && y == excludeTile.y) continue;
				var tile = this.board_emulator.tiles[x][y];
				if(!tile) continue;
				if(!tile.actor) continue;
				if(tile.actor.type != 'player') continue;
				if(side && tile.actor.owner.side != side) continue;
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
	},

	// ported from client
	calculateKickDirections: function (puckTile, player) {
		var anticheat = this;

		var directions = [],
			neighborhood;

		// we assume puck is blocked by players around it until we don't see empty tile near it
		var blockedByPlayers = true;

		// we assume there is no owner of turn near puck until we see some
		var noOwnerNearPuck = true;

		neighborhood = puckTile.neighborhood();

		neighborhood.forEach(function(actorTile) {
			var actorAngle,
				dx,
				dy,
				oppositeTile;

			// is there empty space near puck?
			if (!actorTile.actor) {
				blockedByPlayers = false;
			}

			// is there owner of turn near puck?
			if (actorTile.actor && actorTile.actor.owner == player) {
				noOwnerNearPuck = false;
			}

			// we need to know in which direction we can kick puck
			// for that we need to know on which side of puck is owner of turn located
			// for that we interested only in owners around puck
			if (!actorTile.actor || actorTile.actor.owner !== player) {
				return;
			}

			// find relative position of the actor on this tile
			dx = actorTile.x - puckTile.x;
			dy = actorTile.y - puckTile.y;

			// find tile on the other side of the ball based on the actor's
			// position
			oppositeTile = anticheat.board_emulator.tile(puckTile.x - dx, puckTile.y - dy);

			// find the relative angle of the player to the puck (atan2's
			// arguments are passed in backwards, counterintuitively)
			actorAngle = Math.atan2(dy, dx);

			// iterate through the neighbors of the puck and find their
			// relative positions to the puck, then compare the atan2 of
			// that relative position to the atan2 of the relative position
			// of the player; if the absolute of resulting value is greater or
			// equal to 1.57 degrees radian, we know that that direction is not
			// "backwards" for the current actor and we will add it to the
			// list of directions; otherwise, we can't add this tile
			neighborhood.forEach(function (tile) {
				var diffAngle,
					tileAngle = Math.atan2(tile.y - puckTile.y, tile.x - puckTile.x);

				diffAngle = Math.abs(actorAngle - tileAngle);

				if (diffAngle > Math.PI) {
					diffAngle = Math.PI * 2 - diffAngle;
				}

				if (// the direction is greater than 45º away from the player
				((diffAngle >= 1.57) ||

					// or the puck is against a wall and the player is facing
					// the wall
					((!oppositeTile || oppositeTile.type === "wall") &&
						dx * dy === 0) ||

					// or the puck is in a corner
					(neighborhood.length < 4)) &&

				// and the tile is not occupied or already in the list
				!tile.actor &&

				// and the tile is not already in the list
				directions.indexOf(tile) < 0) {

					// then we can add this direction to the list
					directions.push(tile);
				}
			});
		});

		return {
			directions: directions,
			blockedByPlayers: blockedByPlayers,
			noOwnerNearPuck: noOwnerNearPuck
		};
	}
};

module.exports = Anticheat;