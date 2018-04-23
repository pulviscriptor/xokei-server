var Tile = require('../tile');
var ActorPlayer = require('../actor.player');
var ActorPuck = require('../actor.puck');

function BoardEmulator(anticheat, game_emulator) {
	this.anticheat = anticheat;
	this.game_emulator = game_emulator;

	this.real_board = this.anticheat.real_game.board;
	this.id = 'emulated_' + this.real_board.id;

	this.tiles = [];
	this.owner = this.real_board.owner; // whos turn is now
	this.puck = null;

	this.build();
	this.copyFromReal();
}

BoardEmulator.prototype = {
	build: function () {
		for(var x=0;x<=13;x++) {
			this.tiles[x] = [];
			for(var y=0;y<=7;y++) {
				this.tiles[x][y] = null;
			}
		}
	},

	copyFromReal: function () {
		for(var x=0;x<=13;x++) {
			for(var y=0;y<=7;y++) {
				var realTile = this.real_board.tile(x, y);
				if(!realTile) continue;

				this.tiles[x][y] = new Tile(this, x, y);
				if(!realTile.actor) continue;

				if(realTile.actor.type == 'puck') {
					if(this.puck) throw new Error('Attempted to place puck at ' + x + ',' + y + ' but puck already placed ' + this.puck);
					this.puck = new ActorPuck(this);
					this.tiles[x][y].place(this.puck);
				}else if(realTile.actor.type == 'player') {
					this.tiles[x][y].place(new ActorPlayer(this, realTile.actor.owner));
				}else{
					throw new Error('Unknown actor in real_board: ' + realTile.actor);
				}
			}
		}
	},

	tile: function (x, y) {
		if(!this.tiles) return null;
		if(!this.tiles[x]) return null;
		if(!this.tiles[x][y]) return null;

		return this.tiles[x][y];
	},

	// converting board to ASCII text for debug purposes
	toASCII: function () {
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
	}
};

module.exports = BoardEmulator;