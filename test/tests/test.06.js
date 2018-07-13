var utils = require('../utils/utils');
var expect = require('chai').expect;
var server;
var client1;
var client2;
var player1;
var player2;
var room = null;

describe('Testing anticheat', function () {
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

	describe('Trying to cheat with puck placing', function () {
		it('trying place puck on opponent side', function (done) {
			player1.place_puck('g7');
			server.wait_error('Error: Attempted to place puck on wrong territory', done);
		});

		it('trying place puck on my end zone', function (done) {
			player1.place_puck('b3');
			server.wait_error('Error: Attempted to place puck in endZone', done);
		});

		it('trying place puck on my goal zone', function (done) {
			player1.place_puck('[5');
			server.wait_error('Error: Attempted to place puck in goal zone', done);
		});

		it('trying place puck on x:0 y:0', function (done) {
			player1.send("turn",{"scored":false,"history":[{"target":{"type":"Begin round"}},{"target":{"type":"place puck"},"finish":{"x":0,"y":0}}]});
			server.wait_error('Error: There is no tile at 0,0', done);
		});

		it('trying place puck on x:50 y:50', function (done) {
			player1.send("turn",{"scored":false,"history":[{"target":{"type":"Begin round"}},{"target":{"type":"place puck"},"finish":{"x":50,"y":50}}]});
			server.wait_error('Error: There is no tile at 50,50', done);
		});

		it('trying place puck twice in one turn', function (done) {
			player1.send("turn",{"scored":false,"history":[{"target":{"type":"place puck"},"finish":{"x":3,"y":4}},{"target":{"type":"place puck"},"finish":{"x":3,"y":3}}]});
			server.wait_error('Error: Expected game_emulator.state to be "placing puck" but it is "game started"', done);
		});

		it('trying place puck when is not your turn', function (done) {
			player2.place_puck('h5');
			server.wait_error('Error: Player attempted to move but its not his turn', done);
		});

		it('should place puck at f5', function (done) {
			player1.place_puck('f5', done);
		});

		it('trying place puck again by player1', function (done) {
			player1.place_puck('f5');
			server.wait_error('Error: Player attempted to move but its not his turn', done);
		});

		it('trying place puck again by player2', function (done) {
			player2.place_puck('g5');
			server.wait_error('Error: Expected game_emulator.state to be "game started" but it is "playing round"', done);
		});

		it('trying place puck by raw 1 turn packet by player1', function (done) {
			player1.send("turn",{"scored":false,"history":[{"target":{"type":"place puck"},"finish":{"x":6,"y":1}}]});
			server.wait_error('Error: Player attempted to move but its not his turn', done);
		});

		it('trying place puck by raw 1 turn packet by player2', function (done) {
			player2.send("turn",{"scored":false,"history":[{"target":{"type":"place puck"},"finish":{"x":7,"y":1}}]});
			server.wait_error('Error: Sent scored=false but there is 1 moves in turn', done);
		});
	});

	describe('Trying to cheat with moves', function () {
		it('trying send garbage in turn.history', function (done) {
			player2.send("turn",{"scored":false,"history":['dsfsdf','dfsdfsdf']});
			server.wait_error('Error: Empty turn.history[0].target received', done);
		});

		it('trying send garbage in turn.history[0].target', function (done) {
			player2.send("turn",{"scored":false,"history":[{target:'sdfsdf'}]});
			server.wait_error('Error: Missing move.target.type', done);
		});

		it('trying send garbage in turn.history[0].target', function (done) {
			player2.send("turn",{"scored":false,"history":[{target:{type:'sdfsdf'}}]});
			server.wait_error('Error: Unknown move.target.type value: sdfsdf', done);
		});

		it('trying to do 0 moves in turn', function (done) {
			player2.send("turn",{"scored":false,"history":[]});
			server.wait_error('Error: Empty turn.history[0] received', done);
		});

		it('trying to do 3 moves in turn', function (done) {
			player2.turn(
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
					},
					{
						move: 'actor',
						from: 'g5',
						to: 'g4'
					}
				]
			);
			server.wait_error('Error: Received third move in turn', done);
		});

		it('trying to do 1 move in turn', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					}
				]
			);
			server.wait_error('Error: Sent scored=false but there is 1 moves in turn', done);
		});

		it('2 moves in turn where 1 move is goal and 2 is move actor', function (done) {
			player2.turn(
				[
					{
						move: 'puck',
						from: 'f5',
						to: '[5',
						direction: 'left'
					},
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					}
				]
			);
			// because server turn.js sees `scored` and sets is to move #2 and our move #1 will be scored=false
			server.wait_error('Error: Client sent scored=undefined but anticheat calculated scored=player2', done);
		});

		it('move while is not your turn', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					},
					{
						move: 'actor',
						from: 'e8',
						to: 'd8'
					}
				]
			);
			server.wait_error('Error: Player attempted to move but its not his turn', done);
		});

		it('move actor more than 1 tile away', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					},
					{
						move: 'actor',
						from: 'g3',
						to: 'i5'
					}
				]
			);
			server.wait_error('Error: Attempted to move actor more than 2 tiles', done);
		});

		it('move actor more than 1 tile away', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					},
					{
						move: 'actor',
						from: 'g4',
						to: 'i6'
					}
				]
			);
			server.wait_error('Error: Attempted to move actor more than 2 tiles', done);
		});

		it('move actor more than 1 tile away', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					},
					{
						move: 'actor',
						from: 'g4',
						to: 'i5'
					}
				]
			);
			server.wait_error('Error: Attempted to move actor more than 2 tiles', done);
		});

		it('move actor more than 1 tile away', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g4'
					},
					{
						move: 'actor',
						from: 'g4',
						to: 'g6'
					}
				]
			);
			server.wait_error('Error: Attempted to move actor more than 2 tiles', done);
		});

		it('move actor to same position', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g3'
					},
					{
						move: 'actor',
						from: 'g3',
						to: 'g3'
					}
				]
			);
			server.wait_error('Error: There is actor already at finish tile', done);
		});

		it('move actor to place of another actor', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'g2'
					},
					{
						move: 'actor',
						from: 'g2',
						to: 'g1'
					}
				]
			);
			server.wait_error('Error: There is actor already at finish tile', done);
		});

		it('move actor but start is puck', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'f5',
						to: 'g5'
					},
					{
						move: 'actor',
						from: 'f5',
						to: 'h5'
					}
				]
			);
			server.wait_error('Error: actor at start tile has type puck, expected player', done);
		});

		it('move actor of opponent', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'f6',
						to: 'f7'
					},
					{
						move: 'actor',
						from: 'f7',
						to: 'f6'
					}
				]
			);
			server.wait_error('but owner of that actor is [Player1', done);
		});
	});

	describe('Trying to make 2 moves in turn where both moves is goal', function () {
		it('kick puck f5->a5, actor g5->g6', function (done) {
			player2.turn(done,
				[
					{
						move: 'puck',
						from: 'f5',
						to: 'a5',
						direction: 'left'
					},
					{
						move: 'actor',
						from: 'g6',
						to: 'g5'
					}
				]
			);
		});

		it('actor f6->e6->d6', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'f6',
						to: 'e6'
					},
					{
						move: 'actor',
						from: 'e6',
						to: 'd6'
					}
				]
			);
		});

		it('actor g5->g6->g5', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g5',
						to: 'g6'
					},
					{
						move: 'actor',
						from: 'g6',
						to: 'g5'
					}
				]
			);
		});

		it('actor d6->c6->b6', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'd6',
						to: 'c6'
					},
					{
						move: 'actor',
						from: 'c6',
						to: 'b6'
					}
				]
			);
		});

		it('actor g5->g6->g5', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g5',
						to: 'g6'
					},
					{
						move: 'actor',
						from: 'g6',
						to: 'g5'
					}
				]
			);
		});

		it('actor [4->[5->a5', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: '[4',
						to: '[5'
					},
					{
						move: 'actor',
						from: '[5',
						to: 'a4'
					}
				]
			);
		});

		it('actor g5->g6->g5', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g5',
						to: 'g6'
					},
					{
						move: 'actor',
						from: 'g6',
						to: 'g5'
					}
				]
			);
		});

		it('sending 2 valid goal moves in turn', function (done) {
			player1.turn(
				[
					{
						move: 'puck',
						from: 'a5',
						to: '[4',
						direction: 'down-left'
					},
					{
						move: 'puck',
						from: '[4',
						to: '[5',
						direction: 'up'
					}
				]
			);
			// because server turn.js sees `scored` and sets is to move #2 and our move #1 will be scored=false
			server.wait_error('Error: Client sent scored=undefined but anticheat calculated scored=player2', done);
		});
	});

	describe('Trying to cheat with actors positions', function () {
		it('move player1 towards player1 goal zone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'f3',
						to: 'e3'
					},
					{
						move: 'actor',
						from: 'e3',
						to: 'd3'
					}
				]
			);
		});

		it('move player2 towards player1 goal zone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g5',
						to: 'f5'
					},
					{
						move: 'actor',
						from: 'f5',
						to: 'e5'
					}
				]
			);
		});

		it('move player1 towards player1 goal zone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'd3',
						to: 'c3'
					},
					{
						move: 'actor',
						from: 'f1',
						to: 'e1'
					}
				]
			);
		});

		it('move player2 towards player1 goal zone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'e5',
						to: 'd5'
					},
					{
						move: 'actor',
						from: 'd5',
						to: 'c5'
					}
				]
			);
		});

		it('move 3 actors in endZone while nobody in goalZone (should NOT be able to)', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'b6',
						to: 'a6'
					},
					{
						move: 'actor',
						from: 'c3',
						to: 'b3'
					}
				]
			);
			server.wait_error('already 2 or more actors', done);
		});

		it('move player1 towards player1 goal zone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'b6',
						to: 'a6'
					},
					{
						move: 'actor',
						from: 'a4',
						to: '[4'
					}
				]
			);
		});

		it('move player2 towards player1 goal zone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g3',
						to: 'f3'
					},
					{
						move: 'actor',
						from: 'f3',
						to: 'e3'
					}
				]
			);
		});

		it('move player1 towards player1 goal zone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'e1',
						to: 'd2'
					},
					{
						move: 'actor',
						from: 'd2',
						to: 'c2'
					}
				]
			);
		});

		it('move player2 towards player1 goal zone', function (done) {
			player2.turn(done,
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
		});

		it('move 3 actors in endZone while somebody in goalZone (should NOT be able to)', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'c3',
						to: 'b4'
					},
					{
						move: 'actor',
						from: 'c2',
						to: 'b3'
					}
				]
			);
			server.wait_error('already 2 or more actors', done);
		});

		it('move goalkeeper to enfZone while there is 2 actors (should NOT be able to)', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'c3',
						to: 'b4'
					},
					{
						move: 'actor',
						from: '[4',
						to: 'a4'
					}
				]
			);
			server.wait_error('already 2 or more actors', done);
		});

		it('move 2 actors to goal zone (should NOT be able to)', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'c3',
						to: 'b4'
					},
					{
						move: 'actor',
						from: 'a6',
						to: '[5'
					}
				]
			);
			server.wait_error('in "player1_goal" already 1 or more actors', done);
		});

		it('move player1 towards player1 goal zone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					},
					{
						move: 'actor',
						from: 'e8',
						to: 'd8'
					}
				]
			);
		});

		it('move player2 towards player1 goal zone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'c5',
						to: 'b5'
					},
					{
						move: 'actor',
						from: 'b5',
						to: 'a4'
					}
				]
			);
		});

		it('move 2xPlayer1 and 1xPlayer2 actors to Player1 endZone', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'd8',
						to: 'c8'
					},
					{
						move: 'actor',
						from: '[4',
						to: 'a3'
					}
				]
			);
		});

		it('move opponent actor to goal zone (should NOT be able to)', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'a4',
						to: '[5'
					},
					{
						move: 'actor',
						from: '[5',
						to: '[4'
					}
				]
			);
			server.wait_error('Attempted to move to opponent\'s goal zone', done);
		});
	});

	describe('Moving 5 actors to opponent endZone (should be able to)', function () {
		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'k5',
						to: 'j5'
					},
					{
						move: 'actor',
						from: 'j5',
						to: 'i5'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'i5',
						to: 'h5'
					},
					{
						move: 'actor',
						from: 'h5',
						to: 'g5'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g5',
						to: 'f5'
					},
					{
						move: 'actor',
						from: 'f5',
						to: 'e5'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g8',
						to: 'f7'
					},
					{
						move: 'actor',
						from: 'f7',
						to: 'e6'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g1',
						to: 'f1'
					},
					{
						move: 'actor',
						from: 'f1',
						to: 'e1'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'e1',
						to: 'd1'
					},
					{
						move: 'actor',
						from: 'd1',
						to: 'c1'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'c1',
						to: 'b2'
					},
					{
						move: 'actor',
						from: 'b2',
						to: 'b3'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'e6',
						to: 'd6'
					},
					{
						move: 'actor',
						from: 'd6',
						to: 'c6'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'e5',
						to: 'd5'
					},
					{
						move: 'actor',
						from: 'd5',
						to: 'c5'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'e3',
						to: 'd4'
					},
					{
						move: 'actor',
						from: 'd4',
						to: 'c4'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a6',
						to: 'a7'
					},
					{
						move: 'actor',
						from: 'a7',
						to: 'a6'
					}
				]
			);
		});

		it('move player2 towards player1 endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'c6',
						to: 'b6'
					},
					{
						move: 'actor',
						from: 'c5',
						to: 'b5'
					}
				]
			);
		});

		it('skip player 1 move', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'c2',
						to: 'b2'
					},
					{
						move: 'actor',
						from: 'b2',
						to: 'a2'
					}
				]
			);
		});

		it('move last player2 into endZone', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'c4',
						to: 'c5'
					},
					{
						move: 'actor',
						from: 'c5',
						to: 'b4'
					}
				]
			);
		});

		it('move player1 into goalZone and replace actor with another player', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'a3',
						to: '[4'
					},
					{
						move: 'actor',
						from: 'a2',
						to: 'a3'
					}
				]
			);
		});

		it('finishing round by goal', function (done) {
			player2.turn(
				[
					{
						move: 'puck',
						from: 'a5',
						to: '[5',
						direction: 'left'
					}
				]
			);
			server.wait('Destroying | code: SCORED', done);
		});
	});

	describe('Trying to cheat with puck kicking', function () {
		it('place puck at e5', function (done) {
			player1.place_puck('e5', done);
		});

		it('kick puck while not near it', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g8',
						to: 'h8'
					},
					{
						move: 'puck',
						from: 'e5',
						to: '[5',
						direction: 'left'
					}
				]
			);
			server.wait_error('Error: Attempted to kick puck but there is no player near it', done);
		});

		it('kick puck on wrong direction', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'f5'
					},
					{
						move: 'puck',
						from: 'e5',
						to: 'f4',
						direction: 'right-down'
					}
				]
			);
			server.wait_error('not valid direction', done);
		});

		it('kick puck to wrong tile (correct trajectory)', function (done) {
			player2.send('turn', {"scored":false,"history":[{"target":{"type":"actor"},"start":{"x":7,"y":2},"finish":
				{"x":6,"y":3}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":5,"y":6},"trajectory":
				[{"x":4,"y":2},{"x":3,"y":1},{"x":2,"y":0},{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3},{"x":4,"y":4},
					{"x":5,"y":5},{"x":6,"y":6}]}]});
			server.wait_error('not found inside trajectory', done);
		});

		it('kick puck over actor', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'f5'
					},
					{
						move: 'puck',
						from: 'e5',
						to: 'h2',
						direction: 'up-left'
					}
				]
			);
			server.wait_error('Received more tiles in trajectory than anticheat calculated', done);
		});

		it('kick puck but start is actor', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'f5'
					},
					{
						move: 'puck',
						from: 'f5',
						to: 'a1',
						direction: 'down-left'
					}
				]
			);
			server.wait_error('No puck in start tile', done);
		});

		it('kick puck with missing 1 tile in trajectory', function (done) {
			player2.send('turn', {"scored":false,"history":[{"target":{"type":"actor"},"start":{"x":7,"y":2},"finish":
				{"x":6,"y":3}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":6,"y":6},"trajectory":
				[{"x":4,"y":2},{"x":3,"y":1},{"x":2,"y":0},{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3},
					{"x":5,"y":5},{"x":6,"y":6}]}]});
			server.wait_error('Trajectory mismatch', done);
		});

		it('kick puck with 2 same tiles in trajectory', function (done) {
			player2.send('turn', {"scored":false,"history":[{"target":{"type":"actor"},"start":{"x":7,"y":2},"finish":
				{"x":6,"y":3}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":6,"y":6},"trajectory":
				[{"x":4,"y":2},{"x":3,"y":1},{"x":2,"y":0},{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3},{"x":3,"y":3},{"x":4,"y":4},
					{"x":5,"y":5},{"x":6,"y":6}]}]});
			server.wait_error('Trajectory mismatch', done);
		});
	});

	describe('Kick puck crossing center of board more than 1 times', function () {
		it('move actors to positions', function (done) {
			player2.turn(done,
				[
					{
						move: 'actor',
						from: 'g6',
						to: 'f5'
					},
					{
						move: 'actor',
						from: 'g1',
						to: 'g2'
					}
				]
			);
		});

		it('kick puck', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					},
					{
						move: 'puck',
						from: 'e5',
						to: 'f4',
						direction: 'left-up'
					}
				]
			);
			server.wait_error('Received more tiles in trajectory than anticheat calculated', done);
		});
	});

	describe('Send wrong `scored`', function () {
		it('send scored when not scored', function (done) {
			player1.send('turn',{"scored":"player1","history":[{"target":{"type":"actor"},"start":{"x":6,"y":2},
				"finish":{"x":5,"y":2}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":1,"y":3},
				"trajectory":[{"x":4,"y":3},{"x":3,"y":3},{"x":2,"y":3},{"x":1,"y":3}]}]});
			server.wait_error('Client sent scored=player1 but anticheat calculated scored=false', done);
		});

		it('send not scored when scored', function (done) {
			player1.send('turn',{"scored":false,"history":[{"target":{"type":"actor"},"start":{"x":6,"y":2},
				"finish":{"x":5,"y":2}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":0,"y":3},
				"trajectory":[{"x":4,"y":3},{"x":3,"y":3},{"x":2,"y":3},{"x":1,"y":3},{"x":0,"y":3}]}]});
			server.wait_error('Client sent scored=undefined but anticheat calculated scored=player2', done);
		});

		it('send scored wrong side', function (done) {
			player1.send('turn',{"scored":"player1","history":[{"target":{"type":"actor"},"start":{"x":6,"y":2},
				"finish":{"x":5,"y":2}},{"target":{"type":"puck"},"start":{"x":5,"y":3},"finish":{"x":0,"y":3},
				"trajectory":[{"x":4,"y":3},{"x":3,"y":3},{"x":2,"y":3},{"x":1,"y":3},{"x":0,"y":3}]}]});
			server.wait_error('Client sent scored=player1 but anticheat calculated scored=player2', done);
		});

		it('finish round', function (done) {
			player1.turn(done,
				[
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					},
					{
						move: 'puck',
						from: 'e5',
						to: '[5',
						direction: 'left'
					}
				]
			);
		});
	});

	describe('More checks', function () {
		it('move actor before puck placed', function (done) {
			player1.turn(
				[
					{
						move: 'actor',
						from: 'f8',
						to: 'e8'
					},
					{
						move: 'actor',
						from: 'e8',
						to: 'd8'
					}
				]
			);
			server.wait_error('Expected game_emulator.state to be "playing round" but it is "game started"', done);
		});

		it('another game in running game before puck placed', function (done) {
			player1.send('another_game');
			server.wait_error('Player sent `another_game` but state of game is: game started', done);
		});

		it('place puck', function (done) {
			player1.place_puck('f5', done);
		});

		it('another game in running game before puck placed', function (done) {
			player1.send('another_game');
			server.wait_error('Player sent `another_game` but state of game is: playing round', done);
		});

		it('begin round when game running', function (done) {
			player2.place_puck('f7');
			server.wait_error('Expected game_emulator.state to be "game started" but it is "playing round"', done);
		});

		it('begin round as second move', function (done) {
			player2.send('turn', {"scored":false,"history":[
				{"target":{"type":"actor"},"start":{"x":7,"y":2},"finish":{"x":8,"y":2}},
				{"target":{"type":"Begin round"}}
			]});
			server.wait_error('Expected game_emulator.state to be "game started" but it is "playing round"', done);
		});

		it('make goal', function (done) {
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

		it('place puck', function (done) {
			player1.place_puck('f5', done);
		});

		it('make goal', function (done) {
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

		it('place puck', function (done) {
			player1.place_puck('f5', done);
		});

		it('make goal', function (done) {
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

		it('place puck', function (done) {
			player1.place_puck('f5', done);
		});

		it('make goal', function (done) {
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

	describe('After game won checks', function () {
		it('begin game after game won', function (done) {
			player2.place_puck('f5');
			server.wait_error('Expected game_emulator.state to be "game started" but it is "game inactive"', done);
		});

		it('move after game won', function (done) {
			player2.turn(
				[
					{
						move: 'actor',
						from: 'g1',
						to: 'g1'
					},
					{
						move: 'actor',
						from: 'g1',
						to: 'h1'
					}
				]
			);
			server.wait_error('Error: Expected game_emulator.state to be "playing round" but it is "game inactive"', done);
		});
	});

	describe('start another game and make goal', function () {
		it('request another game', function (done) {
			player1.send('another_game');
			player2.wait('another_game_request', done);
		});

		it('confirm another game', function (done) {
			player2.send('another_game');
			player1.wait('another_game_started', done);
		});
	});


	//+todo place puck on wrong side
	//+todo place puck when is not your turn
	//+todo place puck on end zone
	//+todo place puck on goal zone
	//+todo place puck on coordinates 0x0
	//+todo place puck on coordinates 50x50
	//+todo place puck without beginning round
	//+todo place puck twice in one turn
	//+todo place puck when already placed by player1
	//+todo place puck when already placed by player2
	//+todo place puck by raw 1 turn packet by player1
	//+todo place puck by raw 1 turn packet by player2

	//+todo send garbage in turn.history
	//+todo send garbage in turn.history[0].target
	//+todo send garbage in turn.history[0].target.type

	//+todo 0 moves in turn
	//+todo 3 moves in turn
	//+todo 1 move in turn
	//+todo 2 moves in turn where 1 move is goal and 2 is move actor
	//+todo move while is not your turn
	//+todo move actor more than 1 tile away
	//+todo move actor to same position
	//+todo move actor to place of another actor
	//+todo move actor but start is puck
	//+todo move actor of opponent
	//+todo 2 moves in turn where both moves is goal (move goalkeeper out of goal zone and kick puck to goal and then 1 tile away in same goal zone)
	//+todo move 3 actors in endZone while nobody in goalZone (should NOT be able to)
	//+todo move 3 actors in endZone while somebody in goalZone (should NOT be able to)
	//+todo move goalkeeper to enfZone while there is 2 actors (should NOT be able to)
	//+todo move 2 own actors to goal zone (should NOT be able to)
	//+todo move 2xPlayer1 and 1xPlayer2 actors to Player1 endZone
	//+todo move opponent actor to goal zone (should NOT be able to)
	//+todo move 5 actors to opponent endZone (should be able to)

	//+todo kick puck while not near it
	//+todo kick puck on wrong direction
	//+todo kick puck to wrong tile (correct trajectory)
	//+todo kick puck over actor
	//+todo kick puck but start is actor
	//+todo kick puck with missing 1 tile in trajectory
	//+todo kick puck with 2 same tiles in trajectory
	//+todo kick puck crossing center of board more than 1 times

	//+todo send scored when not scored
	//+todo send not scored when scored
	//+todo send scored wrong side
	//+todo move actor before puck placed
	//+todo another game in running game before puck placed
	//+todo another game in running game after puck placed
	//+todo begin round when game running
	//+todo begin round as second move
	//+todo begin game after game won
	//+todo move after game won
	//todo start another game and make goal

	describe('Destroying server', function () {
		it('should stop server', function(done) {
			server.wait('WebSocket server closed', done);
			server.destroy('Test is done');
		});
	});
});
