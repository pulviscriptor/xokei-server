var testConfig = require('../config');
var GameServer = require('../../src/server');
var Logger = require('../../src/logger');

function Server() {
	this.server = null;
	this.stdout_listeners = [];
	this.stderr_listeners = [];
	this.error = false;

	this.prepare();
}

Server.prototype.prepare = function () {
	var server = this;

	Logger.stdout = function (msg) {
		if(testConfig.verbose) {
			console.log(msg);
		}

		for(var i=0;i<server.stdout_listeners.length;i++) {
			server.stdout_listeners[i](msg);
		}
	};
	Logger.stderr = function (msg) {
		var caught = false;

		if(testConfig.verbose) {
			console.log(msg);
		}

		for(var i=0;i<server.stderr_listeners.length;i++) {
			if(server.stderr_listeners[i](msg)) {
				caught = true;
			}
		}

		if(!caught) {
			server.error = true;
			throw new Error('Uncaught server error: ' + msg);
		}
	};
};

Server.prototype.start = function (cb) {
	if(this.server) throw new Error('Server already exists');
	if(!cb) throw new Error('Server.start needs callback');

	this.server = new GameServer({
		host: testConfig.host,
		port: testConfig.port,
		debug: (testConfig.verbose ? 5 : 0)});

	this.wait('Ready for incoming connections', cb);
};

// wait log message from server
Server.prototype.wait = function (text, cb) {
	var server = this;

	var timeout = setTimeout(function () {
		removeListener();
		cb(new Error('Waited for "' + text + '" message but did not saw it in time'));
	}, testConfig.timeout);

	var listener = function (msg) {
		if(msg.indexOf(text) >= 0) {
			removeListener();
			clearTimeout(timeout);
			cb();
		}
	};

	var removeListener = function () {
		var id = server.stdout_listeners.indexOf(listener);
		if(id < 0) throw new Error('Fatal utils error: did not found callback in server.listeners for text "' + text + '"');
		server.stdout_listeners.splice(id, 1);
	};

	server.stdout_listeners.push(listener);
};
Server.prototype.wait_error = function (text, cb) {
	var server = this;

	var timeout = setTimeout(function () {
		removeListener();
		cb(new Error('Waited for "' + text + '" error message but did not saw it in time'));
	}, testConfig.timeout);

	var listener = function (msg) {
		if(msg.indexOf(text) >= 0) {
			removeListener();
			clearTimeout(timeout);
			cb();
			return true;
		}
	};

	var removeListener = function () {
		var id = server.stderr_listeners.indexOf(listener);
		if(id < 0) throw new Error('Fatal utils error: did not found callback in server.listeners for error text "' + text + '"');
		server.stderr_listeners.splice(id, 1);
	};

	server.stderr_listeners.push(listener);
};

Server.prototype.destroy = function (reason, cb) {

	this.server.destroy(reason);
};

module.exports = Server;