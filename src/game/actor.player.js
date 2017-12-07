var Logger = require('../logger');

function ActorPlayer(board, owner) {
	this.type = 'player';
	this.owner = owner;
	this.board = board;
}

module.exports = ActorPlayer;