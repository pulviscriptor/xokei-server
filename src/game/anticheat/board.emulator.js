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
	/*toASCII: function () {
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
	}*/

	// converting board to ASCII text for debug purposes
	toASCII: function (str) {
		// don't ask how I did this
		var ASCIITable =
			'     0   1   2   3   4   5   6   7   8   9   10  11  12  13   \n' +
			'       ╔═══╤═══╤═══╤═══╤═══╤═══╦═══╤═══╤═══╤═══╤═══╤═══╗      \n' +
			' 8   S#║ # │ # │ # │ # │ # │ # ║ # │ # │ # │ # │ # │ # ║ S#  0\n' +
			'       ╟───┼───┼───┼───┼───┼───╫───┼───┼───┼───┼───┼───╢      \n' +
			' 7   S#║ # │ # │ # │ # │ # │ # ║ # │ # │ # │ # │ # │ # ║ S#  1\n' +
			'       ╠═══╪═══╗───┼───┼───┼───╫───┼───┼───┼───╔═══╪═══╣      \n' +
			' 6   S#║ # │ # ║ # │ # │ # │ # ║ # │ # │ # │ # ║ # │ # ║ S#  2\n' +
			'   ╔═══╣───┼───╫───┼───┼───┼───╫───┼───┼───┼───╫───┼───╠═══╗  \n' +
			' 5 ║ # ║ # │ # ║ # │ # │ # │ # ║ # │ # │ # │ # ║ # │ # ║ # ║ 3\n' +
			'   ╟───╫───┼───╫───┼───┼───┼───╫───┼───┼───┼───╫───┼───╫───╢  \n' +
			' 4 ║ # ║ # │ # ║ # │ # │ # │ # ║ # │ # │ # │ # ║ # │ # ║ # ║ 4\n' +
			'   ╚═══╣───┼───╫───┼───┼───┼───╫───┼───┼───┼───╫───┼───╠═══╝  \n' +
			' 3   S#║ # │ # ║ # │ # │ # │ # ║ # │ # │ # │ # ║ # │ # ║ S#  5\n' +
			'       ╠═══╪═══╝───┼───┼───┼───╫───┼───┼───┼───╚═══╪═══╣      \n' +
			' 2   S#║ # │ # │ # │ # │ # │ # ║ # │ # │ # │ # │ # │ # ║ S#  6\n' +
			'       ╟───┼───┼───┼───┼───┼───╫───┼───┼───┼───┼───┼───╢      \n' +
			' 1   S#║ # │ # │ # │ # │ # │ # ║ # │ # │ # │ # │ # │ # ║ S#  7\n' +
			'       ╚═══╧═══╧═══╧═══╧═══╧═══╩═══╧═══╧═══╧═══╧═══╧═══╝      \n' +
			'     [   a   b   c   d   e   f   g   h   i   j   k   l   ]    ';

		var out = '';
		var x = 0;
		var y = 0;
		var lines = ASCIITable.split("\n");
		for(var i=0;i<lines.length;i++) {
			x = 0;
			var line = lines[i];

			out += '\n';

			if(line.indexOf('#') < 0) {
				out += line;
			}else{
				for(var j=0;j<line.length;j++) {
					var symbol = line[j];
					if(symbol == '#') {
						var tile = this.tiles[x][y];

						if(!tile || !tile.actor) {
							out += ' ';
						}else if(tile.actor && tile.actor.owner && tile.actor.owner.side == 'player1') {
							out += '1';
						}else if(tile.actor && tile.actor.owner && tile.actor.owner.side == 'player2') {
							out += '2';
						}else if(tile.actor && tile.actor.type == 'puck') {
							out += 'P';
						}else{
							lines[y] += '?'
						}

						x++;
					}else{
						out += symbol;
					}
				}
				y++;
			}
		}

		return (str || '') + out;
	}
};

module.exports = BoardEmulator;