var config = require('../config');
var Logger = require('../logger');
var utils = require('../utils');
var Tile = require('./tile');
var ActorPlayer = require('./actor.player');
var ActorPuck = require('./actor.puck');

function Board(game) {
	this.game = game;
	this.room = game.room;
	this.player1 = game.player1;
	this.player2 = game.player2;
	this.player1.board = this;
	this.player2.board = this;

	this.debug = game.debug;

	this.id = game.id;
	this.log = new Logger('Board:' + this.id);
	this.dead = null;

	this.tiles = [];
	this.owner = null; // whos turn is now
	this.puck = null;

	this.build();
	this.fill();

	if(this.debug >= 1)
		this.log.info('Board created for players ' + this.player1 + ' and ' + this.player2);
}

Board.prototype.toString = function () {
	return '[Board ' + this.id + ']';
};

Board.prototype.destroy = function (code, comment) {
	// basic code of `destroy` functions
	var reason = 'code: ' + code + ' | comment: ' + comment;

	if(this.dead) {
		if(this.debug >= 1)
			this.log.error('Attempted to destroy with reason: ' + reason + ' but already dead with reason: ' + reason);
		return;
	}

	if(this.debug >= 3)
		this.log.info('Destroying | ' + reason);

	this.dead = code + ' | ' + comment;

	//todo destroy all actors
};

Board.prototype.build = function () {
	for(var x=0;x<=13;x++) {
		this.tiles[x] = [];
		for(var y=0;y<=7;y++) {
			// do not create tiles outside the board
			if(x == 0 && y == 0) continue;
			if(x == 0 && y == 1) continue;
			if(x == 0 && y == 2) continue;
			if(x == 0 && y == 5) continue;
			if(x == 0 && y == 6) continue;
			if(x == 0 && y == 7) continue;

			if(x == 13 && y == 0) continue;
			if(x == 13 && y == 1) continue;
			if(x == 13 && y == 2) continue;
			if(x == 13 && y == 5) continue;
			if(x == 13 && y == 6) continue;
			if(x == 13 && y == 7) continue;

			this.tiles[x][y] = new Tile(this, x, y);
		}
	}
};

Board.prototype.fill = function () {
	this.tiles[0][4].place(new ActorPlayer(this, this.player1));
	this.tiles[6][0].place(new ActorPlayer(this, this.player1));
	this.tiles[6][2].place(new ActorPlayer(this, this.player1));
	this.tiles[6][5].place(new ActorPlayer(this, this.player1));
	this.tiles[6][7].place(new ActorPlayer(this, this.player1));

	this.tiles[13][3].place(new ActorPlayer(this, this.player2));
	this.tiles[7][0] .place(new ActorPlayer(this, this.player2));
	this.tiles[7][2] .place(new ActorPlayer(this, this.player2));
	this.tiles[7][5] .place(new ActorPlayer(this, this.player2));
	this.tiles[7][7] .place(new ActorPlayer(this, this.player2));
};

// will be sent to players in room
Board.prototype.pack = function() {
	var obj = {actors: []};
	var actors = obj.actors;

	for(var x=0;x<this.tiles.length;x++) {
		for(var y=0;y<this.tiles[x].length;y++) {
			var tile = this.tiles[x][y];
			if(tile && tile.actor && tile.actor instanceof ActorPlayer) {
				actors.push({
					x: x,
					y: y,
					owner: tile.actor.owner.side
				})
			}
		}
	}

	return obj;
};

Board.prototype.tile = function (x, y) {
	if(!this.tiles) return null;
	if(!this.tiles[x]) return null;
	if(!this.tiles[x][y]) return null;

	return this.tiles[x][y];
};


//todo is this code used at all? move.js:execute placing puck instead of this code
Board.prototype.placePuck = function (x, y) {
	if(this.puck) throw new Error('Attempted to place puck, but puck already placed');
	if(this.game.state != this.game.STATES.PLACING_PUCK) throw new Error('Attempted to place puck, but game is in ' + this.game.state + ' state');
	var tile = this.tile(x, y);
	if(!tile) throw new Error('Attempted to place puck, but there is no tile at: ' + x + ',' + y);
	if(tile.actor) throw new Error('Attempted to place puck, but there is actor ' + tile.actor + ' at: ' + x + ',' + y);

	this.puck = new ActorPuck(this);
	this.room.send('puck_placed', x, y);
	//todo place actor on tile
};

// converting board to ASCII text for debug purposes
Board.prototype.toASCII = function () {
	var lines = [];

	for(var x=0;x<=13;x++) {
		for(var y=0;y<=7;y++) {
			if(!lines[y]) lines[y] = '';
			if(x == 7) lines[y] += '|';
			var tile = this.tiles[x][y];
			if(!tile) {
				lines[y] += ' ';
			}else if(tile.actor && tile.actor.owner && tile.actor.owner.side == 'player1') {
				lines[y] += '1';
			}else if(tile.actor && tile.actor.owner && tile.actor.owner.side == 'player2') {
				lines[y] += '2';
			}else if(tile.actor && tile.actor.type == 'puck') {
				lines[y] += 'P';
			}else if(!tile.actor) {
				lines[y] += '#'
			}else{
				lines[y] += '?'
			}
		}
	}
	return "\r\n" + lines.join("\r\n");
};

module.exports = Board;