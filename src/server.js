var WebSocket = require('ws');
var Logger = require('./logger');
var Client = require('./client');
var config = require('./config');

// change this version on protocol updates that will not work on old clients
const VERSION = '1.0.0';

function Server(app, opt) {
	this.app = app;
	this.host = opt.host;
	this.port = opt.port;

	this.wss = null;
	this.log = new Logger('Server');

	this.clients = {};

	this.createWebsocketServer();
}

Server.prototype.createWebsocketServer = function () {
	if(config.debug >= 1)
		this.log.info('starting websocket server on ' + this.host + ':' + this.port);

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

		if(config.debug >= 2)
			server.log.info('new incoming connection from ' + ip + ':' + port);

		// happened in past, not sure if fixed. Lets check it.
		if(ws.readyState != ws.OPEN) {
			if(config.debug >= 1)
				server.log.error('Connection from ' + ip + ':' + port + ' emitted "connection" event with state "' + ws.readyState + '". `ws` library bug? Ignoring connection!');
		}else{
			var client = new Client(server, ws, req);
			client.send('welcome', VERSION);
		}
	});

	this.wss.on('error', function (e) {
		if(config.debug >= 1)
			server.log.error('WebSocket server error: ' + e);
	});

	this.wss.on('listening', function () {
		if(config.debug >= 1)
			server.log.info('ready for incoming connections');
	});
};

Server.prototype.addClient = function (client) {
	if(this.clients[client.id]) {
		if(config.debug >= 1)
			this.log.error('attempted to add client ' + client + ' but already added in client list | will ignore this call');
	}else{
		this.clients[client.id] = client;

		if(config.debug >= 3)
			this.log.info('added client ' + client + ' | total clients: ' + Object.keys(this.clients).length);
	}
};

Server.prototype.removeClient = function (client) {
	if(!this.clients[client.id]) {
		if(config.debug >= 1)
			this.log.error('attempted to remove client ' + client + ' but did not found in client list | will ignore this call');
	}else{
		delete this.clients[client.id];

		if(config.debug >= 3)
			this.log.info('removed client ' + client + ' | total clients: ' + Object.keys(this.clients).length);
	}

};

module.exports = Server;