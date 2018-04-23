var ActorPuck = require('./actor.puck');

function Move(turn, opt) {
	if(!opt.type) throw new Error('Missing opt.type for move type');

	this.game 	= turn.game;

	//this.owner 	= opt.owner; 		// player
	this.type 		= opt.type; 		// string
	this.start 		= opt.start; 		// {x, y}
	this.finish 	= opt.finish; 		// {x, y}
	this.trajectory = opt.trajectory; 	// {{x:x, y:y}, {x:x, y:y}, ... }
	this.scored		= false;			// will be set by `turn.js` to `player`
}

Move.prototype = {
	packForClient: function () {
		var ret = {
			score: this.game.score,
			target: {}
		};

		if(this.type == 'Begin round') {
			ret.target.type = 'Begin round';
		}else if(this.type == 'place puck') {
			ret.target.type = 'place puck';
			ret.target.x = this.finish.x;
			ret.target.y = this.finish.y;
		}else if(this.type == 'actor') {
			ret.target.type = 'actor';
			ret.start = this.start;
			ret.finish = this.finish;
		}else if(this.type == 'puck') {
			ret.target.type = 'puck';
			ret.start = this.start;
			ret.finish = this.finish;
			ret.trajectory = this.trajectory;
		}else{
			throw new Error('Unknown move type: ' + this.type);
		}

		return ret;
	},

	// place move on board/game which can be real/emulated
	execute: function (game, board) {
		if(this.type == 'Begin round') {
			game.setState(game.STATES.PLACING_PUCK);
		}else if(this.type == 'place puck') {
			game.setState(game.STATES.PLAYING_ROUND);
			board.tile(this.finish.x, this.finish.y).place(new ActorPuck(board));
		}else if(this.type == 'actor') {
			var start = board.tile(this.start.x, this.start.y);
			var finish = board.tile(this.finish.x, this.finish.y);
			start.moveTo(finish);
		}else if(this.type == 'puck') {
			start = board.tile(this.start.x, this.start.y);
			finish = board.tile(this.finish.x, this.finish.y);
			start.moveTo(finish);
			// scored?
			if(this.scored) {
				return {scored: this.scored};
			}
		}else{
			throw new Error('Unknown move type: ' + this.type);
		}
	}
};

module.exports = Move;