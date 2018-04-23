var expect = require('chai').expect;
var utils;
var server;
var client;

describe('Testing testing utils', function () {
	describe('Loading utils', function () {
		it('should require utils', function() {
			utils = require('../utils/utils');
		});
	});

	describe('Starting server', function () {
		it('should start server', function(done) {
			server = new utils.Server();

			server.start(done);
		});
	});

	describe('Testing client', function () {
		it('should create client', function () {
			client = new utils.Client(server, {id: 'TestPlayer'});
		});

		it('should connect to server', function (done) {
			client.connect(done);
		});

		it('should send packet to server and receive response', function (done) {
			client.send('check_room', 'TEST');
			client.wait('RECV(check_room_result)', done);
		});
	});

	describe('Testing server', function () {
		it('should receive packet from client', function (done) {
			server.wait('RECV: ["check_room","TEST"]', done);
			client.send('check_room', 'TEST');
		});

		it('should receive invalid packet from client', function (done) {
			server.wait_error('Failed to find processor for packet', done);
			client.send('testing_non_existing_processor', '123');
		});
	});

	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
