var zones = require('./zones');

function Tile(board, x, y) {
	this.board = board;
	this.x = x;
	this.y = y;
	this.actor = null;
	this.zones = zones[x][y];
	this.owner = (this.zones.indexOf('player1') >= 0) ? 'player1' : 'player2'; //todo this should be "side" not "owner"
}

Tile.prototype.toString = function () {
	var horizontal = ["[", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "]"];
	var vertical = ["8", "7", "6", "5", "4", "3", "2", "1"];
	return '[Tile ' + (horizontal[this.x] + vertical[this.y]) + ' (' + this.x + ',' + this.y + ') of ' + this.board.id + ']';
};

Tile.prototype.place = function (actor) {
	if(this.actor) throw new Error('Attempted to place actor ' + actor + ' at tile ' + this + ' but actor ' + this.actor + ' already placed here');
	this.actor = actor;
};


Tile.prototype.moveTo = function (target_tile) {
	var actor = this.actor;
	if(!actor) throw new Error('Attempted to move actor from ' + this + ' to tile ' + target_tile + ' but there is no actor');
	target_tile.place(actor);
	this.actor = null;
};


Tile.prototype.inZone = function (player, str) {
	var zone;
	if(!str) {
		zone = player;
	}else{
		zone = (player.side || player) + '_' + str;
	}

	return this.zones.indexOf(zone) >= 0;
};

// ported from client
Tile.prototype.neighborhood = function () {
	var dx = [0, -1, -1, -1, 0, 1, 1, 1],
		dy = [1, 1, 0, -1, -1, -1, 0, 1],
		self = this;

	return dx.map(function (x, i) {
		var tile;

		if (self.board.tiles[self.x + x]) {
			tile = self.board.tiles[self.x + x][self.y + dy[i]];

			if (tile) {
				return tile;
			}
		}
	}).filter(Boolean);
};


module.exports = Tile;