var config = require('./config');
var Logger = require('./logger');

function Player(client, opt) {
	this.client = client;
	this.room = null;
	this.game = null;
	this.board = null;
	this.name = opt.name;

	// "player1" for left, "player2" for right side
	this.side = null;
	// game will set this to Player of another player in room
	this.opponent = null;

	this.id = client.id;
	this.dead = null;
	this.debug = this.client.debug;
	this.log = new Logger('Player:' + this.id);

	if(this.debug >= 2)
		this.log.info('Player created');
}

Player.prototype.toString = function () {
	if(this.side == 'player1') {
		return '[Player1 ' + this.id + ']';
	}else if(this.side == 'player2') {
		return '[Player2 ' + this.id + ']';
	}
	return '[Player ' + this.id + ']';
};

Player.prototype.send = function () {
	var args = Array.prototype.slice.call(arguments);
	this.client.send.apply(this.client, args);
};

Player.prototype.destroy = function (code, comment) {
	// basic code of `destroy` functions
	var reason = 'code: ' + code + ' | comment: ' + comment;

	if(this.dead) {
		if(this.debug >= 1)
			this.log.error('Attempted to destroy with reason: ' + reason + ' but already dead with reason: ' + reason);
		return;
	}

	// DO NOT call Player.destroy if you want to destroy player, call Player.client.destroy instead!
	if(!this.client.dead) {
		this.log.error('Something attempted to destroy player without destroying client! Something will leak!');
	}

	if(this.debug >= 3)
		this.log.info('Destroying | ' + reason);

	this.dead = code + ' | ' + comment;

	// request room to remove player
	// room will destroy game
	if(this.room) {
		this.room.removePlayer(this, code, comment);
	}
};

Player.prototype.processors = {
	'place_puck': function (user_x, user_y) {
		var x = parseInt(user_x);
		var y = parseInt(user_y);

		if(!this.board) throw new Error('Attempted to place puck, but there is no board');
		if(!Number.isInteger(x)) throw new Error('Attempted to place puck, but x is not integer: ' + user_x);
		if(!Number.isInteger(y)) throw new Error('Attempted to place puck, but y is not integer: ' + user_y);
		if(this.board.owner != this) throw new Error('Attempted to place puck, but board owner is ' + this.board.owner);

		var tile = this.board.tile(x, y);
		if(!tile) throw new Error('Attempted to place puck, but there is no tile at: ' + user_x + ',' + user_y);
		if(!tile.inZone(this, 'territory')) throw new Error('Attempted to place puck, but tile is not in territory zone at: ' + user_x + ',' + user_y);
		if(tile.inZone(this, 'endZone')) throw new Error('Attempted to place puck, but tile is in endZone at: ' + user_x + ',' + user_y);

		this.board.placePuck(x, y);
		this.game.setState(this.game.STATES.PLAYING_ROUND);
		this.game.waitTurn(this.opponent);
	}
};

module.exports = Player;