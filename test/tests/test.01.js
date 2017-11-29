var expect = require('chai').expect;
var testConfig;

// to store server
var Server;
var server;

// to store log
var Logger;

// to catch server error in this test
var server_error = false;

// this "dirty hack" is used only for this test file, next tests will use utils
var on_stdout = null;

describe('Start and destroy server', function () {
	describe('Preparing for test', function () {
		it('should require config', function() {
			testConfig = require('../config');
		});

		it('should require logger', function() {
			Logger = require('../../src/logger.js');
		});

		it('should re-define logger stdout/stderr', function() {
			Logger.stdout = function (msg) {
				if(testConfig.verbose) {
					console.log(msg);
				}
				if(on_stdout) {
					on_stdout(msg);
				}
			};
			Logger.stderr = function (e) {
				server_error = true;
				console.error(e);
				process.nextTick(function () {
					throw e;
				});
			};
		});

		it('should require server', function() {
			Server = require('../../src/server.js');
		});
	});

	describe('Testing server launch and destroy', function() {
		it('should confirm that server is started', function (done) {
			// this "dirty hack" is used only for this test file, next tests will use utils
			var timeouted = false;
			var timeout = setTimeout(function () {
				timeouted = true;
				done(new Error('Server did not confirmed start!'));
			}, 1000);

			on_stdout = function (msg) {
				if(msg.indexOf('Ready for incoming connections') >= 0) {
					clearTimeout(timeout);
					done();
				}
			};

			server = new Server({
				host: testConfig.host,
				port: testConfig.port,
				debug: 3});
		});

		it('should destroy server and complete test', function (done) {
			// this "dirty hack" is used only for this test file, next tests will use utils
			var timeouted = false;
			var timeout = setTimeout(function () {
				timeouted = true;
				done(new Error('Server did not confirmed WebSocket close!'));
			}, 1000);

			on_stdout = function (msg) {
				if(msg.indexOf('WebSocket server closed') >= 0) {
					clearTimeout(timeout);
					done();
				}
			};

			server.destroy('Test is done');
		});

		it('should finish without stderr output', function () {
			expect(server_error).to.be.equal(false);
		});
	});
});
