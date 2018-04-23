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
		if(this.debug >= 1)
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
	'turn': function (turn) {
		try {
			this.game.turn(this, turn);
		}catch(e){
			this.log.info('Board dump: ' + this.board.toASCII());
			throw e;
			//todo this.game.rejectTurn(turn, e);
		}

		this.log.info('-------------DEBUG:');
		this.log.info(this.board.toASCII());
	},

	'another_game': function () {
		if(!this.game) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no old game'));
		if(!this.game.board) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no game.board'));
		if(this.game.state != this.game.STATES.GAME_INACTIVE) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but state of game is: ' + this.game.state));
		if(!this.game.winner) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no winner'));

		if(!this.game.another_game_request) {
			this.game.another_game_request = this;
			this.opponent.send('another_game_request');
		}else{
			if(this.game.another_game_request == this) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but we have his request already'));
			//todo start another game
			if(this.debug >= 1)
				this.log.info('Starting another game');
			this.game.anotherGame();
		}
	}
};

module.exports = Player;