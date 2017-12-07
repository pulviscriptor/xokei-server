var zones = require('./zones');

function Tile(board, x, y) {
	this.board = board;
	this.x = x;
	this.y = y;
	this.actor = null;
	this.zones = zones[x][y];
}

Tile.prototype.toString = function () {
	return '[Tile ' + this.x + ',' + this.y + ' of ' + this.board.id + ']';
};

Tile.prototype.place = function (actor) {
	if(this.actor) throw new Error('Attempted to place actor ' + actor + ' at tile ' + this + ' but actor ' + this.actor + ' already placed here');
	this.actor = actor;
};

Tile.prototype.inZone = function (player, str) {
	var zone;
	if(!str) {
		zone = player;
	}else{
		zone = player.side + '_' + str;
	}

	return this.zones.indexOf(zone) >= 0;
};


module.exports = Tile;