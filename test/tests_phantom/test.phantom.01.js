var utils = require('../utils/utils');
var expect = require('chai').expect;
var server;
var player2;

//todo DEBUG
require('../config').port = 9000;

function skipRound(owner, target, done) {
	var client = player2;
	var server_turn = client.side == ('player' + owner);
	var puck_place = (owner==1 ? 'f5' : 'g4');
	var kick_direction = (target==1 ? ( owner==1 ? 'left' : 'up-left' ) : ( owner==1 ? 'down-right' : 'right' ) );
	var kick_target = (target==1 ? '[5' : ']4');

	if(server_turn) {
		player2.place_puck(puck_place);
		player2.wait('RECV(receive_turn)', done);
	}else{
		player2.wait('RECV(receive_turn)', function () {
			player2.turn(
				[
					{
						move: 'puck',
						from: puck_place,
						to: kick_target,
						direction: kick_direction
					}
				]
			);
			if(done) done();
		});
	}
}

describe('Playing game', function () {
	describe('Starting server', function () {
		it('should start server', function(done) {
			server = new utils.Server();

			server.start(done);
		});
	});

	describe('Creating client as player2', function () {
		var started = (+new Date);
		var createPublicRoom = function (done) {
			var delta = (+new Date) - started;
			if (delta >= 4000) throw new Error('Failed to get side player2 in 4000ms');
			var client = new utils.Client(server, {id: 'Player2'});
			client.connect(function () {
				client.send('create_room', {type: 'public', name: 'ServerPlayer'});
				client.wait('RECV(wait_opponent)', function () {
					if (client.side == 'player2') {
						player2 = client;
						done();
					} else {
						client.kill('Got side ' + client.side + ' but wait for player2', true);
						createPublicRoom(done);
					}
				});
			});
		};

		it('should create client2', function (done) {
			createPublicRoom(done);
		});

		it('should wait for PhantomJS player join', function (done) {
			player2.wait('RECV(opponent_joined)', done);
		});

		it('should set game.config.looserStartsAnotherGame to false', function () {
			server.server.rooms[player2.room_id].game.config.looserStartsAnotherGame = false;
		});

		it('should wait for PhantomJS player turn', function (done) {
			player2.wait('RECV(receive_turn)', done);
		});

		it('should wait 1 sec for PhantomJS to run tests while is not his turn', function (done) {
			setTimeout(done, 1000);
		});

		it('should move actor from g1 to h2 to i3', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g1',
						to: 'h2'
					},
					{
						move: 'actor',
						from: 'h2',
						to: 'i3'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should make goal', function () {
			player2.turn(
				[
					{
						move: 'puck',
						from: 'f5',
						to: ']4',
						direction: 'right-down'
					}
				]
			);
		});
	});

	describe('Blocking puck', function () {
		it('should place puck at h4', function (done) {
			player2.place_puck('h4');
			player2.wait('RECV(receive_turn)', done);
		});

		it('should move actor from g1 to h2 to i3', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g1',
						to: 'h2'
					},
					{
						move: 'actor',
						from: 'h2',
						to: 'i3'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should move actor from g6 to h6 to i5', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'h6'
					},
					{
						move: 'actor',
						from: 'h6',
						to: 'i5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should move actor from ]5 to l5 to k5', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: ']5',
						to: 'l5'
					},
					{
						move: 'actor',
						from: 'l5',
						to: 'k5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should move actor from k5 to j5 to i4', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'k5',
						to: 'j5'
					},
					{
						move: 'actor',
						from: 'j5',
						to: 'i4'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should attempt to kick blocked puck', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g8',
						to: 'g7'
					},
					{
						move: 'puck',
						from: 'h4',
						to: 'h6',
						direction: 'up'
					}
				]
			);
			server.wait_error('Attempted to kick puck but its blocked by players', done);
		});

		it('move actor from i4 to j4 to j5', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'i4',
						to: 'j4'
					},
					{
						move: 'actor',
						from: 'j4',
						to: 'j5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});


	});

	describe('Goal in 1 move', function () {
		it('should place puck at g4', function (done) {
			player2.place_puck('g4');
			player2.wait('RECV(receive_turn)', done);
		});

		it('should place puck at g5', function (done) {
			player2.place_puck('g5');
			player2.wait('RECV(receive_turn)', done);
		});

		it('should place puck at g5', function (done) {
			player2.place_puck('g5');
			player2.wait('RECV(receive_turn)', done);
		});

	});

	describe('Goal from 1 tile away', function () {
		it('should place puck at j4', function (done) {
			player2.place_puck('j4');
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from g6 to g7 to h7', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'g7'
					},
					{
						move: 'actor',
						from: 'g7',
						to: 'h7'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from h7 to h6 to h5', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'h7',
						to: 'h6'
					},
					{
						move: 'actor',
						from: 'h6',
						to: 'h5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from h5 to h4 to h3', function () {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'h5',
						to: 'h4'
					},
					{
						move: 'actor',
						from: 'h4',
						to: 'h3'
					}
				]
			);
		});

		it('wait another game request', function (done) {
			player2.wait('["another_game_request"]', done);
		});
	});

	describe('Starting another game', function () {
		it('starting another game', function (done) {
			player2.send('another_game');
			player2.wait('["another_game_started"]', done);
		});

		it('should skip round', function (done) {
			skipRound(1, 2, done);
		});
	});

	describe('Shoot puck backwards from wall', function () {
		it('should place puck at i8', function () {
			player2.place_puck('i8');
		});

		it('should wait player1 turn', function (done) {
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from g8 to f8 to e8', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g8',
						to: 'f8'
					},
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});
	});
	describe('Players blocking goal zone', function () {
		it('should place puck at j5', function (done) {
			player2.place_puck('j5');
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from g8 to h7 to i6', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g8',
						to: 'h7'
					},
					{
						move: 'actor',
						from: 'h7',
						to: 'i6'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from i6 to j6 to k6', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'i6',
						to: 'j6'
					},
					{
						move: 'actor',
						from: 'j6',
						to: 'k6'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from k6 to l5 and g6 to h6', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'k6',
						to: 'l5'
					},
					{
						move: 'actor',
						from: 'g6',
						to: 'h6'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from h6 to i5 to j4', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'h6',
						to: 'i5'
					},
					{
						move: 'actor',
						from: 'i5',
						to: 'j4'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from j4 to k4 to l4', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'j4',
						to: 'k4'
					},
					{
						move: 'actor',
						from: 'k4',
						to: 'l4'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor from g3 to h3 to i3', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'h3'
					},
					{
						move: 'actor',
						from: 'h3',
						to: 'i3'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should not allow actor to move into goal zone', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'i3',
						to: 'j3'
					},
					{
						move: 'actor',
						from: 'j3',
						to: 'k3'
					}
				]
			);
			server.wait_error('in "player2_endZone" already 2 or more actors', done);
		});

		it('move actor from i3 to j3, l5 to k5', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'i3',
						to: 'j3'
					},
					{
						move: 'actor',
						from: 'l5',
						to: 'k5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should make goal', function (done) {
			player2.turn(
				[
					{
						move: 'puck',
						from: 'j5',
						to: '[5',
						direction: 'left'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

	});
	describe('Infinite puck bouncing', function () {
		it('move actor from g1 to g2, ]5 to ]4', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g1',
						to: 'g2'
					},
					{
						move: 'actor',
						from: ']5',
						to: ']4'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		it('should make goal by player1 to player2', function (done) {
			skipRound(1, 2, done);
		});

		it('should make goal by player2 to player1', function (done) {
			skipRound(2, 1, done);
		});

		it('should make goal by player1 to player2', function (done) {
			skipRound(1, 2, done);
		});

		it('should make goal by player2 to player2', function (done) {
			skipRound(2, 2, done);
		});

		it('should make goal by player2 to player2', function (done) {
			skipRound(2, 2, done);
		});

		it('should wait for player1 disconnect', function (done) {
			server.wait('code: CLIENT_DISCONNECTED', done);
		});
	});
	describe('Basics', function () {
		var started;
		var createPublicRoom = function (done) {
			var delta = (+new Date) - started;
			if (delta >= 4000) throw new Error('Failed to get side player2 in 4000ms');
			var client = new utils.Client(server, {id: 'Player2'});
			client.connect(function () {
				client.send('create_room', {type: 'public', name: 'ServerPlayer'});
				client.wait('RECV(wait_opponent)', function () {
					if (client.side == 'player2') {
						player2 = client;
						done();
					} else {
						client.kill('Got side ' + client.side + ' but wait for player2', true);
						createPublicRoom(done);
					}
				});
			});
		};

		it('should create client2', function (done) {
			started = (+new Date);
			createPublicRoom(done);
		});

		it('should wait for PhantomJS player join', function (done) {
			player2.wait('RECV(opponent_joined)', done);
		});

		it('should wait for PhantomJS player turn', function (done) {
			player2.wait('RECV(receive_turn)', done);
		});

		it('move actor in goal zone to skip round for PhantomJS tests to run', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: ']5',
						to: ']4'
					},
					{
						move: 'actor',
						from: ']4',
						to: ']5'
					}
				]
			);
			player2.wait('RECV(receive_turn)', done);
		});

		for(var i=0;i<3;i++)
			it('Wasting test time', function (done) {
				setTimeout(done, 4000);
			});/**/
	});


	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
