// This code was made long time ago and probably needs to be rewrited
var tty = require('tty');

Logger.colors = [32, 36, 33, 34, 35, 31];
Logger.use_color_id = 0;
Logger.last = process.hrtime();
Logger.stdout = console.log.bind(console);
Logger.stderr = console.error.bind(console);

function Logger(id) {
	this.id = id;
	this.in_tty = tty.isatty(process.stdout.fd);
	this.color_id = Logger.getNewColor();
}

Logger.prototype.info = function(text) {
	var msg = this.formatToLog(1, text);

	Logger.stdout(msg);
};

Logger.prototype.warn = function(text) {
	var msg =  this.formatToLog(3, text);

	if(!this.in_tty)
		Logger.stdout(msg);
	Logger.stderr(msg);
};

Logger.prototype.error = function(e) {
	var logger = this;
	var msg;

	if(!(e instanceof Error)) {
		e = new Error(e);
	}

	/*e.stack.split('\n').map(function (line) {
		msg = logger.formatToLog(2, line);
		if(!logger.in_tty)
			Logger.stdout(msg);
		Logger.stderr(msg);
	});*/

	msg = logger.formatToLog(2, e.stack);
	if(!logger.in_tty)
		Logger.stdout(msg);
	Logger.stderr(msg);
};

Logger.prototype.formatToLog = function(type, text) {
	var out = '';

	if(this.in_tty)
		out += ' ';

	out += this.colorize(90, false, this.getDate());
	out += ' ';

	out += this.colorize(this.id);
	out += ' ';

	if(type == 2)
		out += this.colorize(31, true, true, 'ERROR') + ' ';

	if(type == 3)
		out += this.colorize(33, true, true, 'WARNING') + ' ';

	out += text;
	out += ' ' + this.colorize(false, Logger.delta());

	return out;
};

Logger.prototype.colorize = function() {
	var color = this.color_id;
	var bold = true;
	var inverse = false;
	var text = '';

	if(arguments.length == 1) {
		text = arguments[0];
	}else if(arguments.length == 2){
		bold = !!arguments[0];
		text   = arguments[1];
	}else if(arguments.length == 3){
		color  = arguments[0];
		bold = !!arguments[1];
		text   = arguments[2];
	}else if(arguments.length == 4){
		color   = arguments[0] || color;
		bold    = !!arguments[1];
		inverse = !!arguments[2];
		text    = arguments[3];
	}

	if(!this.in_tty) return text;

	var ret = text + '\u001b[0m';

	if(bold) {
		ret = '\u001b[' + color + ';1m' + ret;
	}else{
		ret = '\u001b[' + color + ';m' + ret;
	}

	if(inverse) ret = '\u001b[7m' + ret;

	return ret;
};

Logger.prototype.getDate = function() {
	var d = new Date();
	return (
		("00" + (d.getDate())).slice(-2) + "." +
		("00" + (d.getMonth() + 1)).slice(-2) + "." +
		d.getFullYear() + " " +
		("00" + d.getHours()).slice(-2) + ":" +
		("00" + d.getMinutes()).slice(-2) + ":" +
		("00" + d.getSeconds()).slice(-2)
	);
};

Logger.getNewColor = function() {
	Logger.use_color_id++;
	if(Logger.use_color_id == Logger.colors.length) {
		Logger.use_color_id = 0;
	}
	return Logger.colors[Logger.use_color_id];
};

Logger.delta = function() {
	var diff = process.hrtime(Logger.last);
	var ret = '+' + ((diff[0] * 1e9 + diff[1])/1e6).toFixed(3) + 'ms';
	Logger.last = process.hrtime();

	return ret;
};

module.exports = Logger;
