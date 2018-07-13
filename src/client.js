var Logger = require('./logger');
var utils = require('./utils');
var config = require('./config');
var Player = require('./player');
var Room = require('./room');

function Client(server, ws, req) {
	this.server = server;
	this.ws   = ws;
	this.req  = req;
	this.ip   = req.connection.remoteAddress;
	this.port = req.connection.remotePort;

	this.debug = this.server.debug;

	this.id = utils.generateClientID(server);
	this.log = new Logger('Client:' + this.id);
	this.dead = null;

	this.player = null;

	if(this.debug >= 1)
		this.log.info('Connected from ' + this.ip + ':' + this.port);

	server.addClient(this);

	this.attachEvents();

	this.send('welcome', server.VERSION);
}

Client.prototype.attachEvents = function () {
	var client = this;

	this.ws.on('close', this.onClose.bind(this));
	this.ws.on('error', this.onError.bind(this));
	this.ws.on('message', this.onMessage.bind(this));
};

Client.prototype.onClose = function (code, reason) {
	if(this.debug >= 1)
		this.log.info('Disconnected | code: ' + code + ' | reason: ' + reason);

	if(!this.dead) {
		this.destroy('CLIENT_DISCONNECTED', 'Client ' + this + ' disconnected | code: ' + code + ' | reason: ' + reason);
	}
};

Client.prototype.onError = function (e) {
	if(this.debug >= 2)
		this.log.warn(e);
};

Client.prototype.onMessage = function (data) {
	if(this.debug >= 3)
		this.log.info('RECV: ' + data);

	try {
		var obj = JSON.parse(data);
	}catch (e){
		if(this.debug >= 1)
			this.log.error(e);
		return;
	}

	var cmd = obj[0];
	var processor;
	var that; // "this" for processor

	if(this.processors[cmd]) {
		that = this;
		processor = this.processors[cmd];
	}else if(this.player && this.player.processors[cmd]) {
		that = this.player;
		processor = this.player.processors[cmd];
	}else{
		return this.log.warn('Failed to find processor for packet: ' + data);
	}

	try {
		processor.apply(that, obj.slice(1));
	}catch (e){
		if(this.debug >= 1)
			this.log.error(e);
	}
};

Client.prototype.destroy = function (code, comment) {
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

	// destroy client
	this.server.removeClient(this);

	if(this.ws.readyState == this.ws.OPEN) {
		this.send('kill', code);
		this.ws.close();
	}

	// destroy player
	// player will request room to remove him and room will tell game to destroy itself
	if(this.player) {
		this.player.destroy(code, comment);
	}
};

Client.prototype.toString = function () {
	return '[Client ' + this.id + ']';
};

Client.prototype.send = function () {
	var args = Array.prototype.slice.call(arguments);
	var json = JSON.stringify(args);

	if(this.ws.readyState != this.ws.OPEN) {
		if(this.debug >= 1)
			this.log.warn('Attempted to send: ' + json + ' | But readyState=' + this.ws.readyState + ' | Ignoring this call');
	}else{
		if(this.debug >= 3)
			this.log.info('SEND: ' + json);

		this.ws.send(json);
	}
};

Client.prototype.processors = {
	'create_room': function (opt) {
		if(!opt) {
			throw new Error('Empty `opt` param');
		}
		if(this.player) {
			throw new Error('Attempted to create new player but player already exists');
		}

		var name = opt.name ? String(opt.name).substr(0, config.playerNameLength) : null;
		this.player = new Player(this, {name: name});

		var type = (opt.type == 'private') ? 'private' : 'public';

		if(type == 'private') {
			var room = new Room(this.server, {type: type});

			room.addPlayer(this.player);
			this.send('invite_friend');
		}else{
			room = this.server.getPublicRoom();
			if(room) {
				room.addPlayer(this.player);
			}else{
				room = new Room(this.server, {type: type});
				room.addPlayer(this.player);
				this.send('wait_opponent');
			}
		}
	},

	'check_room': function (id) {
		var room = this.server.rooms[id];
		if(!room) return this.send('check_room_result', 'NOT_FOUND');
		if(room.game) return this.send('check_room_result', 'GAME_RUNNING');
		this.send('check_room_result', 'AVAILABLE');
	},

	'join_room': function (opt) {
		if(this.player) throw new Error('Client already player');
		if(!opt) throw new Error('`opt` is missing');
		if(!opt.room) throw new Error('`opt.room` is missing');

		var room = this.server.rooms[opt.room];
		if(!room) return this.send('check_room_result', 'NOT_FOUND');
		if(room.game) return this.send('check_room_result', 'GAME_RUNNING');

		var name = opt.name ? String(opt.name).substr(0, config.playerNameLength) : null;
		this.player = new Player(this, {name: name});

		room.addPlayer(this.player);
	}
};

module.exports = Client;