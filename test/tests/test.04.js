var utils = require('../utils/utils');
var expect = require('chai').expect;
var server;
var client1;
var client2;
var player1;
var player2;
var room = null;

describe('Playing game', function () {
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

	describe('Placing puck', function () {
		it('should set game state to "placing puck"', function () {
			expect(player1.game_state).to.be.equal('placing puck');
		});

		it('should place puck at f7', function (done) {
			player1.place_puck('f7', done);
		});

		it('should set game state to "playing round"', function () {
			expect(player1.game_state).to.be.equal('playing round');
		});
	});

	describe('Moving player2 actor from g3 to g4 to g5', function () {
		it('should make 2 moves in 1 turn', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					},
					{
						move: 'actor',
						from: 'g4',
						to: 'g5'
					}
				]
			);
		});
	});


	describe('Moving puck from f7->a4 direction up-left then a4->]4 direction right', function () {
		it('should make 2 moves in 1 turn', function (done) {
			player1.turn(done,
				[
					{
						move: 'puck',
						from: 'f7',
						to: 'a4',
						direction: 'up-left'
					},
					{
						move: 'puck',
						from: 'a4',
						to: ']4',
						direction: 'right'
					}
				]
			);
		});

		it('should have score 1:0', function () {
			expect(JSON.stringify(server.server.rooms[room].game.score)).to.be.equal('{"player1":1,"player2":0}');
		});
	});

	describe('Playing round to win by player2', function () {
		it('should place puck at g5', function (done) {
			player2.place_puck('g5', done);
		});

		it('should make goal in 1 turn', function (done) {
			player1.turn(done,
				[
					{
						move: 'puck',
						from: 'g5',
						to: '[5',
						direction: 'left'
					}
				]
			);
		});
	});

	describe('Playing round to win by player1', function () {
		it('should place puck at f5', function (done) {
			player1.place_puck('f5', done);
		});

		it('should make goal in 1 turn', function (done) {
			player2.turn(done,
				[
					{
						move: 'puck',
						from: 'f5',
						to: '[5',
						direction: 'left'
					}
				]
			);
		});
	});

	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
