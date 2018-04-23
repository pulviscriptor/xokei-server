var BoardEmulator = require('./board.emulator');


function GameEmulator(anticheat) {
	this.anticheat = anticheat;
	this.real_board = this.anticheat.real_game.board;
	this.real_game = this.anticheat.real_game;

	this.STATES = this.real_game.STATES;
	this.state = this.real_game.state;

	this.board_emulator = new BoardEmulator(anticheat, this);
}

GameEmulator.prototype = {
	setState: function (state) {
		if(this.state == state) throw new Error('Attempted to change state to ' + state + ' but game already in this state');
		this.state = state;
	}
};

module.exports = GameEmulator;