var utils = require('../utils/utils');
var expect = require('chai').expect;
var server;
var client1;
var client2;
var room = null;

describe('Testing multiple clients', function () {
	describe('Starting server', function () {
		it('should start server', function(done) {
			server = new utils.Server();

			server.start(done);
		});
	});

	describe('Testing client', function () {
		it('should create client1', function (done) {
			client1 = new utils.Client(server, {id: 'Player1'});
			client1.connect(done);
		});

		it('should create client2', function (done) {
			client2 = new utils.Client(server, {id: 'Player2'});
			client2.connect(done);
		});

		it('should create room for player1', function (done) {
			client1.wait('RECV(invite_friend)', done);
			client1.send('create_room', {type: 'private', name: 'ProPlayer'});
		});

		it('should join player2 in room', function (done) {
			client2.wait('RECV(joined_room)', done);
			client2.send('join_room', {room: client1.game.id, name: 'MegaPlayer'});
		});

		it('should match rooms for player1 and player2', function () {
			expect(client1.game.id).to.be.equal(client2.game.id);
		});
	});

	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
