var config = require('./config');
var Logger = require('./logger');
var utils = require('./utils');

function Game(room) {
	this.room = room;
	this.server = room.server;

	this.debug = config.debug;

	this.id = room.id;
	this.log = new Logger('Game:' + this.id);
	this.dead = null;

	this.player1 = room.player1;
	this.player2 = room.player2;

	this.player1.opponent = this.player2;
	this.player2.opponent = this.player1;

	if(this.debug >= 1)
		this.log.info('Game created for players ' + this.player1 + ' and ' + this.player2);
}

Game.prototype.toString = function () {
	return '[Game ' + this.id + ']';
};

Game.prototype.destroy = function (code, comment) {
	// basic code of `destroy` functions
	var reason = 'code: ' + code + ' | comment: ' + comment;

	if(this.dead) {
		if(this.debug >= 1)
			this.log.error('Attempted to destroy with reason: ' + reason + ' but already dead with reason: ' + reason);
		return;
	}

	// DO NOT call Game.destroy if you want to destroy game, call Game.room.destroy instead!
	if(!this.room.dead) {
		this.log.error('FATAL! Something attempted to destroy game without destroying room!');
		console.log('FATAL! Something attempted to destroy game without destroying room!');
		process.exit(0);
	}

	if(this.debug >= 3)
		this.log.info('Destroying | ' + reason);

	this.dead = code + ' | ' + comment;

	// just curious
	if(!this.player1.dead) {
		if(this.debug >= 1)
			this.log.error('Player1 ' + this.player1 + ' is not dead!');
	}

	if(!this.player2.dead) {
		if(this.debug >= 1)
			this.log.error('Player2 ' + this.player2 + ' is not dead!');
	}
};

Game.prototype.processors = {

};

module.exports = Game;