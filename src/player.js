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
		if(this.debug >= 5) {
			this.log.info(this.board.toASCII('Board before turn:'));
		}

		try {
			this.game.turn(this, turn);
		}catch(e){
			this.log.info('Rejecting last move, board dump: ' + this.board.toASCII());
			this.send('move_rejected');
			throw e;
		}

		if(this.debug >= 5) {
			this.log.info(this.board.toASCII('Board after turn:'));
		}
	},

	'another_game': function () {
		if (!this.game) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no old game'));
		if (!this.game.board) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no game.board'));
		if (this.game.state != this.game.STATES.GAME_INACTIVE) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but state of game is: ' + this.game.state));
		if (!this.game.winner) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but there is no winner'));

		if (!this.game.another_game_request) {
			this.game.another_game_request = this;
			this.opponent.send('another_game_request');
		} else {
			if (this.game.another_game_request == this) return ((this.debug >= 1) && this.log.warn('Player sent `another_game` but we have his request already'));

			if (this.debug >= 1)
				this.log.info('Starting another game');
			this.game.anotherGame();
		}
	},

	// new game clicked instead of "another game"
	'new_game': function () {
		if(!this.game) return ((this.debug >= 1) && this.log.warn('Player sent `new_game` but there is no old game'));
		if(!this.game.board) return ((this.debug >= 1) && this.log.warn('Player sent `new_game` but there is no game.board'));
		if(this.game.state != this.game.STATES.GAME_INACTIVE) return ((this.debug >= 1) && this.log.warn('Player sent `new_game` but state of game is: ' + this.game.state));
		if(!this.game.winner) return ((this.debug >= 1) && this.log.warn('Player sent `new_game` but there is no winner'));

		this.client.destroy('NEW_GAME', 'Game finished, player refused to play another game');
	},

	'resign': function () {
		if(!this.game) return ((this.debug >= 1) && this.log.warn('Player sent `resign` but there is no game'));
		if(this.game.state != this.game.STATES.PLACING_PUCK && this.game.state != this.game.STATES.PLAYING_ROUND) return ((this.debug >= 1) && this.log.warn('Player sent `resign` but state of game is: ' + this.game.state));
		if(this.game.winner) return ((this.debug >= 1) && this.log.warn('Player sent `resign` but there is winner already'));
		if(this.game.resigned) return ((this.debug >= 1) && this.log.warn('Player sent `resign` but it is resigned already'));

		this.game.resign(this);
	}

};

module.exports = Player;