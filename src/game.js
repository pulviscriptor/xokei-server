var config = require('./config');
var Logger = require('./logger');
var utils = require('./utils');
var Board = require('./game/board');
var Turn = require('./game/turn');
var Anticheat = require('./game/anticheat/anticheat');

Game.prototype.STATES = {
	GAME_STARTED: 'game started', 	// until "Begin round" received
	PLACING_PUCK: 'placing puck', 	// after "Begin round" received
	PLAYING_ROUND: 'playing round', // after puck placed
	GAME_INACTIVE: 'game inactive' 	// after game won/before second player joined
};

function Game(room) {
	this.room = room;
	this.server = room.server;
	this.config = config.game;

	this.debug = this.room.debug;

	this.id = room.id;
	this.log = new Logger('Game:' + this.id);
	this.dead = null;
	this.board = null;
	this.turns = [];

	// stuff used for `another game`
	this.winner = null;
	this.another_game_request = null; // will store player who requested another game
	this.score = {
		player1: 0,
		player2: 0
	};

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
	this.meetPlayers();
	this.createBoard();
	this.setState(this.STATES.GAME_STARTED);

	this.room.send('board', this.board.pack());

	this.playerPlacingPuck(this.player1);
};

Game.prototype.meetPlayers = function () {
	this.player1.send('opponent_joined', {name: this.player2.name, side: 'player2'});
	this.player2.send('opponent_joined', {name: this.player1.name, side: 'player1'});
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

Game.prototype.turn = function (player, obj) {
	if(!this.board) throw new Error('There is no board');
	if(this.board.owner != player) throw new Error('Player attempted to move but its not his turn');
	if(!obj) throw new Error('Empty turn received');
	if(!obj.history) throw new Error('Empty turn.history received');
	if(!Array.isArray(obj.history)) throw new Error('Received non-array turn.history');
	if(!obj.history[0]) throw new Error('Empty turn.history[0] received');
	if(!obj.history[0].target) throw new Error('Empty turn.history[0].target received');
	if(obj.history[1] && !obj.history[1].target) throw new Error('Empty turn.history[1].target received');
	if(obj.history[2]) throw new Error('Received third move in turn');

	var turn = new Turn(player, obj);

	var anticheat = new Anticheat(this, player);
	anticheat.checkTurn(turn);
	//anticheat did not produced any errors so we process move
	var result = turn.execute(this);
	this.turns.push(turn);

	if(result && result.scored) {
		this.scored(result.scored);
		player.opponent.send('receive_turn', turn.packForClient());
	}else{
		player.opponent.send('receive_turn', turn.packForClient());
		this.waitTurn(player.opponent);
	}

	/*
	 var tile = this.board.tile(x, y);
	 if(!tile) throw new Error('Attempted to place puck, but there is no tile at: ' + user_x + ',' + user_y);
	 if(!tile.inZone(this, 'territory')) throw new Error('Attempted to place puck, but tile is not in territory zone at: ' + user_x + ',' + user_y);
	 if(tile.inZone(this, 'endZone')) throw new Error('Attempted to place puck, but tile is in endZone at: ' + user_x + ',' + user_y);

	 this.board.placePuck(x, y);
	 this.game.setState(this.game.STATES.PLAYING_ROUND);
	 this.game.waitTurn(this.opponent);*/
};

Game.prototype.scored = function (player) {
	this.score[player.side]++;

	// is game won?
	if(this.score[player.side] >= this.config.scoreToWin) {
		this.won(player);
	}else{
		// creating new board
		// we will not send this to players, they will do it locally
		this.board.destroy('SCORED', player + ' scored');
		this.createBoard();
		this.setState(this.STATES.GAME_STARTED);

		// switch next turn to opponent
		this.board.owner = player.opponent;
	}
};

Game.prototype.won = function (winner) {
	this.setState(this.STATES.GAME_INACTIVE);
	this.winner = winner;
	if(this.debug >= 1)
		this.log.info(winner + ' won the game with score ' + this.score[winner.side] + ':' + this.score[winner.opponent.side]);
};

Game.prototype.anotherGame = function () {
	if(!this.board) return ((this.debug >= 1) && this.log.warn('anotherGame() called but there is no game.board'));
	if(this.state != this.STATES.GAME_INACTIVE) return ((this.debug >= 1) && this.log.warn('anotherGame() called but state of game is: ' + this.game.state));
	if(!this.winner) return ((this.debug >= 1) && this.log.warn('anotherGame() called but there is no winner'));

	this.board.destroy('ANOTHER_GAME', 'Player ' + this.winner + ' won the game and we starting another game');
	this.createBoard();
	this.setState(this.STATES.GAME_STARTED);

	//this.room.send('board', this.board.pack());
	//this.playerPlacingPuck(this.player1);

	if(config.game.looserStartsAnotherGame) {
		this.board.owner = this.winner.opponent;
	}else{
		this.board.owner = this.player1;
	}

	this.cleanup();

	this.room.send('another_game_started');
};

Game.prototype.cleanup = function () {
	this.winner = null;
	this.another_game_request = null;
	this.score = {
		player1: 0,
		player2: 0
	};
};

module.exports = Game;