var config = require('./config');
var Logger = require('./logger');
var utils = require('./utils');
var Game = require('./game');

function Room(server, opt) {
	this.server = server;

	this.debug = this.server.debug;

	this.id = utils.generateRoomID(server);
	this.log = new Logger('Room:' + this.id);
	this.dead = null;

	this.type = opt.type; // "public" or "private"
	this.player1 = null;
	this.player2 = null;
	this.game = null;

	server.addRoom(this);

	if(this.debug >= 1)
		this.log.info('Room created | type=' + opt.type);
}

Room.prototype.toString = function () {
	return '[Room ' + this.id + ']';
};

Room.prototype.destroy = function (code, comment) {
	//todo remove players

	// basic code of `destroy` functions
	var reason = 'code: ' + code + ' | comment: ' + comment;

	if(this.dead) {
		if(this.debug >= 1)
			this.log.error('Attempted to destroy with reason: ' + reason + ' but already dead with reason: ' + reason);
		return;
	}

	if(this.debug >= 3)
		this.log.info('Destroying | ' + reason);

	this.dead = code + ' | ' + comment;

	// removing room from server
	this.server.removeRoom(this);

	// destroying game of this room
	if(this.game) {
		this.game.destroy(code, comment);
	}
};

Room.prototype.addPlayer = function (player) {
	if(this.player1 && this.player2) {
		throw new Error('Attempted to add player ' + player + ' but both sides are occupied');
	}
	if(player.room) {
		throw new Error('Attempted to add player ' + player + ' but he is already in room ' + player.room);
	}

	var side;

	// calculating side of player
	if(this.player1) {
		side = 'player2';
	}else if(this.player2) {
		side = 'player1';
	}else{
		side = (Math.random() > 0.5) ? 'player1' : 'player2';
	}
	player.side = side;
	this[side] = player;

	player.room = this;

	if(this.debug >= 1)
		this.log.info('Player ' + player + ' joined room on side ' + side);

	player.send('joined_room', {room_id: this.id, side: side, type: this.type, name: player.name});

	if(this.player1 && this.player2) {
		this.startGame();
	}
};

Room.prototype.removePlayer = function (player, code, comment) {
	// basic checks
	if(this.debug >= 2)
		this.log.info('Removing player ' + player + ' from room | code: ' + code + ' | comment: ' + comment);

	if(!player.side) {
		if(this.debug >= 1)
			this.log.error('Player ' + player + ' does not have side');
		return;
	}

	if(this[player.side].room.id != player.room.id) {
		if(this.debug >= 1)
			this.log.error('Attempted to remove player ' + player + ' but he is another room (' +  player.room + ')');
		return;
	}

	if(this[player.side].id != player.id) {
		if(this.debug >= 1)
			this.log.error('Attempted to remove player ' + player + '(side ' + player.side + ') but my side ' + player.side + ' is ' + this[player.side]);
		return;
	}

	// making player forget about this room and room about player
	this[player.side].room = null;
	this[player.side] = null;

	// removing and destroying opponent
	if(player.opponent) {
		if(this.debug >= 1)
			this.log.info('Destroying opponent of ' + player + ' (' + player.opponent + ') since ' + player + ' leaved room');

		this[player.opponent.side].room = null;
		this[player.opponent.side] = null;

		player.opponent.client.destroy(code, 'Destroyed by room because opponent removed');
	}

	// destroying this room
	this.destroy(code, comment);
};

Room.prototype.startGame = function () {
	this.game = new Game(this);
};

Room.prototype.send = function () {
	var args = Array.prototype.slice.call(arguments);
	this.player1.client.send.apply(this.player1.client, args);
	this.player2.client.send.apply(this.player2.client, args);
};



module.exports = Room;