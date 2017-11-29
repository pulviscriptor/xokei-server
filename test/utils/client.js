var testConfig = require('../config');
var util = require('util');
var WebSocket = require('ws');

function Client(server, opt) {
	this.id = opt.id;
	this.server = server;

	this.ws = null;
	this.connected = false;
	this.dead = false;
	this.error = null;
	this.stdout_listeners = [];

	this.game = {
		id: null,
		side: null
	};

	this.timers = {
		connect: null
	};

	this.prepare();
}

Client.prototype.prepare = function () {
	this.log = {};

	this.log.info = (function (msg) {
		var client = this;
		if(testConfig.verbose) {
			console.log('Client(' + this.id + '): ' + msg);
		}
		for(var i=0;i<client.stdout_listeners.length;i++) {
			client.stdout_listeners[i](msg);
		}
	}).bind(this);

	this.log.error = (function (e) {
		var client = this;
		client.error = true;
		console.error('Client(' + this.id + ')' + e);
		process.nextTick(function () {
			throw new Error('stderr received, check output and/or enable verbosity in test/config.js to debug problem');
		});
	}).bind(this);
};

Client.prototype.connect = function (cb) {
	if(this.ws) throw new Error('WebSocket already exists');
	if(!cb) throw new Error('Client.connect needs callback');

	this.ws = new WebSocket('ws://' + testConfig.host + ':' + testConfig.port);

	this.attachEvents();
	this.initTimers();

	// call mocha's done() when we receive "welcome" packet
	this.wait('RECV(welcome)', cb);
};

Client.prototype.attachEvents = function () {
	this.ws.onopen = this.onOpen.bind(this);
	this.ws.onclose = this.onClose.bind(this);
	this.ws.onmessage = this.onMessage.bind(this);
	this.ws.onerror = this.onError.bind(this);
};

Client.prototype.wait = function (text, cb) {
	var client = this;

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
		var id = client.stdout_listeners.indexOf(listener);
		if(id < 0) throw new Error('Fatal utils error: did not found callback in client.listeners for text "' + text + '"');
		client.stdout_listeners.splice(id, 1);
	};

	client.stdout_listeners.push(listener);
};

Client.prototype.initTimers = function () {
	var client = this;

	this.timers.connect = setTimeout(function () {
		client.kill('Connection timeout');
	}, testConfig.timeout);
};


Client.prototype.onOpen = function () {
	this.log.info('Connected to server');

	if(this.dead) {
		this.ws.close();
		this.log.info('Client is dead, closing connection');
	}else{
		this.connected = true;
	}
};

Client.prototype.onClose = function (event) {
	this.log.info('Disconnected from server | code: ' + event.code + ' | reason: ' + event.reason);

	if(this.dead) {
		this.connected = false;
	}else{
		if(this.connected) {
			this.connected = false;
			this.kill('Connection lost (' + event.code + ')');
		}else{
			this.kill('Failed to connect (' + event.code + ')');
		}
	}
};

Client.prototype.onMessage = function (event) {
	if(this.dead) {
		return;
	}

	try {
		var obj = JSON.parse(event.data);
	}catch (e){
		return this.log.error('Failed to parse server data: ' + event.data);
	}

	var cmd = obj[0];
	var processor = this.processors[cmd];

	this.log.info('RECV(' + cmd + '): ' + event.data);

	if(!processor) {
		return;
		//this.log.error('Processor not found for packet: ' + event.data);
	}else{
		try {
			processor.apply(this, obj.slice(1));
		}catch (e){
			this.log.error('Failed to process server data (' + event.data + '): ' + e);
		}
	}
};

Client.prototype.onError = function (e) {
	this.log.error('Websocket error: ' + e);
};

Client.prototype.kill = function (reason, silent) {
	if(this.dead) {
		return;
	}

	this.log.info('Kill client, reason: ' + reason + ' | Connected: ' + this.connected);
	if(!silent) {
		this.log.error('Kill client, reason: ' + reason + ' | Connected: ' + this.connected);
	}

	this.dead = reason;
	this.clearTimers();

	if(this.connected) {
		this.ws.close();
	}
};

Client.prototype.clearTimers = function () {
	this.log.info('clearTimers()');

	if(this.timers.connect) clearTimeout(this.timers.connect);
};

Client.prototype.send = function () {
	var args = Array.prototype.slice.call(arguments);
	var json = JSON.stringify(args);

	if(this.ws.readyState != this.ws.OPEN) {
		this.log.error('Attempted to send: ' + json + ' | But readyState=' + this.ws.readyState + ' | Ignoring this call');
	}else{
		this.log.info('SEND(' + args[0] + '): ' + json);

		this.ws.send(json);
	}
};

Client.prototype.processors = {
	'welcome': function () {
		this.connected = true;
		clearTimeout(this.timers.connect);
	},
	
	'kill': function (code) {
		this.dead = code;
		if(this.connected) {
			this.ws.close();
		}
	},

	'joined_room': function (opt) {
		this.game.id = opt.room_id;
		this.game.side = opt.side;
	}
};

module.exports = Client;

