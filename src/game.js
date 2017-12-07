var config = require('./config');
var Logger = require('./logger');
var utils = require('./utils');
var Board = require('./game/board');

Game.prototype.STATES = {
	PLACING_PUCK: 'placing puck',
	PLAYING_ROUND: 'playing round',
	GAME_INACTIVE: 'game inactive'
};

function Game(room) {
	this.room = room;
	this.server = room.server;

	this.debug = this.room.debug;

	this.id = room.id;
	this.log = new Logger('Game:' + this.id);
	this.dead = null;
	this.playing = false;
	this.board = null;

	this.player1 = room.player1;
	this.player2 = room.player2;
	this.player1.game = this;
	this.player2.game = this;
	this.state = this.STATES.GAME_INACTIVE;

	this.player1.opponent = this.player2;
	this.player2.opponent = this.player1;

	if(this.debug >= 1)
		this.log.info('Game created for players ' + this.player1 + ' and ' + this.player2);

	this.start();
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
		this.log.error('FATAL! Something attempted to destroy game without destroying room! Something will leak!');
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

	// finally clean up
	if(this.board) {
		this.board.destroy(code, reason);
	}
};

Game.prototype.start = function () {
	this.playing = true;

	this.meetPlayers();
	this.createBoard();

	this.room.send('board', this.board.pack());

	this.playerPlacingPuck(this.player1);
};

Game.prototype.meetPlayers = function () {
	this.player1.send('opponent_joined', {name: this.player2.name});
	this.player2.send('opponent_joined', {name: this.player1.name});
};

Game.prototype.createBoard = function () {
	this.board = new Board(this);
};

Game.prototype.setState = function (state) {
	if(this.state == state) throw new Error('Attempted to change state to ' + state + ' but game already in this state');
	this.state = state;
};

Game.prototype.playerPlacingPuck = function (player) {
	this.board.owner = player;
	this.setState(this.STATES.PLACING_PUCK);
	this.room.send('place_puck', player.side);
};

// switch board owner and wait for his turn (2 moves)
Game.prototype.waitTurn = function(player) {
	if(!this.board) throw new Error('Attempted to switch board owner to ' + player + ' but there is no board');
	if(this.board.owner == player) throw new Error('Attempted to switch board owner to ' + player + ' but he is already owner');
	if(this.state != this.STATES.PLAYING_ROUND) throw new Error('Attempted to switch board owner to ' + player + ' but game state is ' + this.state);

	this.board.owner = player;
	this.room.send('turn', player.side);
};

module.exports = Game;