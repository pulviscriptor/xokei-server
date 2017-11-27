var expect = require('chai').expect;

// to store server
var Server;
var server;

// to store log
var Logger;
var log_stdout = [];
var log_stderr = [];

// to catch server output in test
// this "dirty hack" is used only for this test file, next tests will use utils
var on_stdout = null;

describe('Start and destroy server', function () {
	describe('Preparing for test', function () {
		it('should require logger', function() {
			Logger = require('../../src/logger.js');
		});

		it('should re-define logger stdout/stderr', function() {
			Logger.stdout = function (msg) {
				log_stdout.push(msg);
				if(on_stdout) {
					on_stdout(msg);
				}
			};
			Logger.stderr = function (msg) {
				log_stdout.push(msg);
				console.error(msg);
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

			server = new Server({host: '127.0.0.1', port: '11333'});
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
			expect(log_stderr.length).to.be.equal(0);
		});
	});
});
