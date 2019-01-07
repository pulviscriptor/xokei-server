// turn = 1 or 2 moves in turn.history
var Move = require('./move');

function Turn(player, obj) {
	this.player = player;
	this.room = player.room;
	this.game = player.room.game;
	this.history = [];
	// false or side of player who gets score for goal "player1" or "player2"
	this.scored = obj.scored ? (obj.scored == 'player1' ? this.game.player1 : this.game.player2) : false;

	// we need to unpack moves from JSON format and check if we received all data we should
	var move1 = this.createMove(obj.history[0], obj.history);
	if(obj.history[1]) {
		var move2 = this.createMove(obj.history[1], obj.history);
	}

	// since client sets turn.scored we need to set it in last move to check in anticheat
	if(this.scored) {
		if(move2) {
			move2.scored = this.scored;
		}else{
			move1.scored = this.scored;
			// if move1 is scored there should be no move2
			if(move2) {
				throw new Error('move1.goal is "' + move1.goal + '" but move2 is present');
			}
		}
	}

	// we validated move formats and re-packed them to remove garbage (just in case)
	this.history.push(move1);
	if(move2) {
		this.history.push(move2);
	}
}

Turn.prototype = {
	createMove: function (move, history) {
		if(!move.target) throw new Error('Missing move.target');
		if(!move.target.type) throw new Error('Missing move.target.type');
		if(typeof move.target.type != 'string') throw new Error('move.target.type is not string');

		if(move.target.type == 'Begin round') {
			//if(move.id == 2) throw new Error('Received "Begin round" move in second move of history but it should be first');
			//if(this.game.turns.length) throw new Error('Received "Begin round" while game.turns is not empty');
			if(!history[1]) throw new Error('Received "Begin round" without second turn');

			return new Move(this, {
				//owner: this.player,
				type: 'Begin round'
			});

		}else if(move.target.type == 'actor') {
			return new Move(this, {
				start: {x: move.start.x, y: move.start.y},
				finish: {x: move.finish.x, y: move.finish.y},
				type: 'actor'
			});
		}else if(move.target.type == 'place puck') {
			return new Move(this, {
				finish: {x: move.finish.x, y: move.finish.y},
				type: 'place puck'
			});
		}else if(move.target.type == 'puck') {
			return new Move(this, {
				start: {x: move.start.x, y: move.start.y},
				finish: {x: move.finish.x, y: move.finish.y},
				trajectory: move.trajectory.map(function (tile) { return {x: tile.x, y: tile.y} }),
				type: 'puck'
			});
		}else{
			throw new Error('Unknown move.target.type value: ' + move.target.type);
		}
	},

	packForClient: function () {
		var ret = {
			owner: this.player.side,
			scored: this.scored.side,
			history: []
		};
		for(var key in this.history) {
			ret.history.push(this.history[key].packForClient());
		}
		return ret;
	},

	execute: function (game) {
		var ret;
		for(var key in this.history) {
			if(ret) {
				throw new Error('We already have turn result to return, why there is another move?');
			}
			var result = this.history[key].execute(game, game.board);
			if(result) ret = result;

			if(this.game.debug >= 5 && this.history.length == 2 && key == 0) {
				this.game.log.info(this.game.board.toASCII('Board after first move, before second move:'));
			}
		}

		return ret;
	}
};

module.exports = Turn;