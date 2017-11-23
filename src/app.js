var Logger = require('./logger');
var Server = require('./server');
var config = require('./config');

function App() {
	this.log = new Logger('App');
	this.debug = config.debug;

	if(this.debug >= 1)
		this.log.info('Creating server');

	this.server = new Server(this, config.server);
}

module.exports = new App();