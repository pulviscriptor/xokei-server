var WebSocket = require('ws');
var Logger = require('./logger');
var Client = require('./client');
var config = require('./config');

// change this version on protocol updates that will not work on old clients
Server.prototype.VERSION = '1.0.0';

function Server(app, opt) {
	this.app = app;
	this.host = opt.host;
	this.port = opt.port;

	this.wss = null;
	this.log = new Logger('Server');

	this.debug = config.debug;

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

module.exports = Server;