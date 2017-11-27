var Logger = require('./logger');
var Server = require('./server');
var config = require('./config');

var log = new Logger('App');

if(config.debug >= 1)
	log.info('Creating server');

var server = new Server(config.server);
