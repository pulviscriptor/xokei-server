var utils = require('../utils/utils');
var expect = require('chai').expect;
var server;
var client1;
var client2;
var player1;
var player2;
var room = null;

describe('Testing malicious packets', function () {
	describe('Starting server', function () {
		it('should start server', function(done) {
			server = new utils.Server();

			server.start(done);
		});
	});

	describe('Creating clients and players', function () {
		it('should create client1', function (done) {
			client1 = new utils.Client(server, {id: 'Client1'});
			client1.connect(done);
		});

		it('should create client2', function (done) {
			client2 = new utils.Client(server, {id: 'Client2'});
			client2.connect(done);

			client1.opponent = client2;
			client2.opponent = client1;
		});

		it('should create room for player1', function (done) {
			client1.wait('RECV(invite_friend)', done);
			client1.send('create_room', {type: 'private', name: 'ProPlayer'});
		});

		it('should join player2 in room', function (done) {
			client2.wait('RECV(joined_room)', done);
			client2.send('join_room', {room: client1.room_id, name: 'MegaPlayer'});
			room = client1.room_id;
		});

		it('should assign sides to client', function () {
			expect(client1.side).not.to.be.null;
			expect(client2.side).not.to.be.null;
			if(client1.side == 'player1') {
				expect(client1.side).to.be.equal('player1');
				expect(client2.side).to.be.equal('player2');
				player1 = client1;
				player2 = client2;
			}else{
				expect(client1.side).to.be.equal('player2');
				expect(client2.side).to.be.equal('player1');
				player1 = client2;
				player2 = client1;
			}
		});
	});

	describe('Attempting to join existing/wrong game and random data', function () {
		var client_tmp;
		it('should create client_tmp', function (done) {
			client_tmp = new utils.Client(server, {id: 'client_tmp'});
			client_tmp.connect(done);
		});

		it('should try join room that player1 and player2 in', function (done) {
			client_tmp.wait('RECV(check_room_result): ["check_room_result","GAME_RUNNING"]', done);
			client_tmp.send('join_room', {room: client1.room_id, name: 'TempPlayer'});
		});

		it('should send random room ID', function (done) {
			client_tmp.wait('["check_room_result","NOT_FOUND"]', done);
			client_tmp.send('join_room', {room: 'sfdsdfsadfsdf', name: 'TempPlayer'});
		});

		it('should send join_room with garbage data', function (done) {
			server.wait_error('Error: `opt.room` is missing', done);
			client_tmp.send('join_room', {random: 'data'});
		});

		it('should send non-existing packet', function (done) {
			server.wait_error('Failed to find processor for packet', done);
			client_tmp.send('non_existing_packet', {random: 'data'});
		});

		it('should send non-JSON packet', function (done) {
			server.wait_error('SyntaxError: Unexpected token r in JSON at position 0', done);
			client_tmp.ws.send('random_string_packet');
		});

		it('should send nullbyte packet', function (done) {
			server.wait_error('Failed to find processor for packet: 0', done);
			client_tmp.ws.send(0x00);
		});

		it('should destroy client_tmp', function (done) {
			server.wait('Removed client', done);
			client_tmp.kill('TEST_DONE', true);
		});
	});

	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
