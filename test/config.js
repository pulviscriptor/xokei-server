var config = {
	// port to launch server during tests
	port: 9010,

	// host for port
	host: '127.0.0.1',

	// output all log messages
	verbose: true,

	// timeout for utils, depends on package.json mocha "--timeout" value
	// by default mocha timeout is 5000ms and utils is 4000ms
	timeout: 4000
};

module.exports = config;