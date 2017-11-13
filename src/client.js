var Logger = require('./logger');
var utils = require('./utils');
var config = require('./config');

function Client(server, ws, req) {
	this.server = server;
	this.ws   = ws;
	this.req  = req;
	this.ip   = req.connection.remoteAddress;
	this.port = req.connection.remotePort;

	this.id = utils.generateClientID(server);
	this.log = new Logger('Client:' + this.id);

	if(config.debug >= 1)
		this.log.info('connected from ' + this.ip + ':' + this.port);

	server.addClient(this);

	this.attachEvents();
}

Client.prototype.attachEvents = function () {
	var client = this;

	this.ws.on('close', function(code, reason) {
		if(config.debug >= 2)
			client.log.info('disconnected | code: ' + code + ' | reason: ' + reason);

		client.server.removeClient(client);
	});

	this.ws.on('error', function(e) {

	});

	this.ws.on('message', function(data) {

	});
};

Client.prototype.toString = function () {
	return '[Client ' + this.id + ']';
};

Client.prototype.send = function () {
	//todo check state is OPEN
	var args = Array.prototype.slice.call(arguments);
	var json = JSON.stringify(args);

	if(config.debug >= 3)
		this.log.info('SEND: ' + json);

	this.ws.send(json);
};

module.exports = Client;