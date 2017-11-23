var config = require('./config');
var Logger = require('./logger');

function Player(client, opt) {
	this.client = client;
	this.room = null;
	this.name = opt.name;

	// "player1" for left, "player2" for right side
	this.side = null;
	// game will set this to Player of another player in room
	this.opponent = null;

	this.id = client.id;
	this.dead = null;
	this.debug = config.debug;
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
		this.log.error('FATAL! Something attempted to destroy player without destroying client!');
		console.log('FATAL! Something attempted to destroy player without destroying client!');
		process.exit(0);
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

};

module.exports = Player;