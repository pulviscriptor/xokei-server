var Logger = require('./logger');
var Server = require('./server');
var config = require('./config');

function App() {
	this.log = new Logger('App');

	if(config.debug >= 1)
		this.log.info('creating server');

	this.server = new Server(this, config.server);
}

module.exports = new App();