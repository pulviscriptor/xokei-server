var WebSocket = require('ws');
var Logger = require('./logger');
var Client = require('./client');
var config = require('./config');

// change this version on protocol updates that will not work on old clients
Server.prototype.VERSION = '1.0.0';

function Server(opt) {
	this.host = opt.host;
	this.port = opt.port;

	this.wss = null;
	this.log = new Logger('Server');

	this.debug = opt.debug || config.debug;

	this.clients = {};
	this.rooms = {};

	this.createWebsocketServer();
}

Server.prototype.createWebsocketServer = function () {
	if(this.debug >= 1)
		this.log.info('Starting websocket server on ' + this.host + ':' + this.port);

	this.wss = new WebSocket.Server({
		host: this.host,
		port: this.port
	});

	this.attachEvents();
};

Server.prototype.attachEvents = function () {
	var server = this;

	this.wss.on('connection', function (ws, req) {
		var ip = req.connection.remoteAddress;
		var port = req.connection.remotePort;

		if(server.debug >= 2)
			server.log.info('New incoming connection from ' + ip + ':' + port);

		// happened in past, not sure if fixed. Lets check it.
		if(ws.readyState != ws.OPEN) {
			if(server.debug >= 1)
				server.log.error('Connection from ' + ip + ':' + port + ' emitted "connection" event with state "' + ws.readyState + '". `ws` library bug? Ignoring connection!');
		}else{
			var client = new Client(server, ws, req);
		}
	});

	this.wss.on('error', function (e) {
		if(server.debug >= 1)
			server.log.error('WebSocket server error: ' + e);
	});

	this.wss.on('listening', function () {
		if(server.debug >= 1)
			server.log.info('Ready for incoming connections');
	});
};

Server.prototype.addClient = function (client) {
	if(this.clients[client.id]) {
		if(this.debug >= 1)
			this.log.error('Attempted to add client ' + client + ' but already added in client list | will ignore this call');
	}else{
		this.clients[client.id] = client;

		if(this.debug >= 3)
			this.log.info('Added client ' + client + ' | total clients: ' + Object.keys(this.clients).length);
	}
};

Server.prototype.removeClient = function (client) {
	if(!this.clients[client.id]) {
		if(this.debug >= 1)
			this.log.error('Attempted to remove client ' + client + ' but did not found in client list | will ignore this call');
	}else{
		delete this.clients[client.id];

		if(this.debug >= 3)
			this.log.info('Removed client ' + client + ' | total clients: ' + Object.keys(this.clients).length);
	}

};

Server.prototype.addRoom = function (room) {
	if(this.rooms[room.id]) {
		if(this.debug >= 1)
			this.log.error('Attempted to add room ' + room + ' but already added in room list | will ignore this call');
	}else{
		this.rooms[room.id] = room;

		if(this.debug >= 3)
			this.log.info('Added room ' + room + ' | total rooms: ' + Object.keys(this.rooms).length);
	}
};

Server.prototype.removeRoom = function (room) {
	if(!this.rooms[room.id]) {
		if(this.debug >= 1)
			this.log.error('Attempted to remove room ' + room + ' but did not found in rooms list | will ignore this call');
	}else{
		delete this.rooms[room.id];

		if(this.debug >= 3)
			this.log.info('Removed room ' + room + ' | total rooms: ' + Object.keys(this.rooms).length);
	}

};

Server.prototype.getPublicRoom = function () {
	for(var room_id in this.rooms) {
		var room = this.rooms[room_id];
		if(room.type != 'public') continue;
		if(room.game) continue;

		// just in case
		if(room.dead) {
			if(this.debug >= 1)
				this.log.error('server.getPublicRoom found dead room in room list: ' + room_id + ', it should not be here!');
			continue;
		}

		return room;
	}
	return null;
};

// when we destroy server node should finish process
// if it is not finishing, then we have leak somewhere
Server.prototype.destroy = function (reason) {
	if(this.debug >= 1)
		this.log.info('Destroying server | reason: ' + reason);


	if(this.debug >= 1)
		this.log.info('Destroying ' + (Object.keys(this.clients).length) + ' clients');

	for(var key in this.clients) {
		var client = this.clients[key];
		if(!client.dead) {
			client.destroy('SERVER_SHUTDOWN')
		}
	}

	if(this.debug >= 1)
		this.log.info('Destroying WebSocket server');

	var server = this;
	this.wss.close(function () {
		if(server.debug >= 1)
			server.log.info('WebSocket server closed, now application should exit otherwise something leaking somewhere');
	});
};

module.exports = Server;