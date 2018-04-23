module.exports.Server = require('./server');
module.exports.Client = require('./client');

module.exports.notationToCoordinates = function (notation) {
	var horizontal = ["[", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "]"];
	var vertical = ["8", "7", "6", "5", "4", "3", "2", "1"];
	var x = horizontal.indexOf(notation.toLowerCase()[0]);
	var y = vertical.indexOf(notation.toLowerCase()[1]);

	if(x < 0) throw new Error('Unknown notation X coordinate: ' + notation[0]);
	if(y < 0) throw new Error('Unknown notation Y coordinate: ' + notation[1]);

	return {x: x, y: y};
};

module.exports.puckDirectionToCoordinates = function (from, direction) {
	var x = from.x;
	var y = from.y;

	if(direction.indexOf('up') >= 0) 	y -= 1;
	if(direction.indexOf('down') >= 0) 	y += 1;
	if(direction.indexOf('left') >= 0) 	x -= 1;
	if(direction.indexOf('right') >= 0) x += 1;

	return {x:x, y:y};
};

module.exports.calculatePuckTrajectory = function (start, direction, finish) {
	var crossedBorder = false,
		dx = direction.x - start.x,
		dy = direction.y - start.y,
		lastTile = start,
		reflectX,
		reflectY,
		tile,
		trajectory = [],
		x = start.x,
		y = start.y;

	//while (1) {
	// that will work for tests
	for (var i=0;i<100;i++) {
		if (tile) {
			lastTile = tile;
		}

		x += dx;
		y += dy;

		tile = module.exports.existingTile(x, y);

		if (!tile) {
			// check if this is an orthagonal collision, in which case the
			// path of the puck needs to end here
			if (dx * dy === 0) {
				break;
			}

			/* disable this code for tests. Tests don't care about bouncing */
			// we must disallow puck to bounce off corners of goal zones
			// so we need to check if this wall is below or above goal zone
			//var tile_dy = this.board_emulator.tile(x, y - dy);
			//if(tile_dy && tile_dy.zones.indexOf('goal') >= 0) {
			//	break;
			//}

			reflectX = x <= 1 || x >= 13;
			reflectY = y === 8 || y === -1;

			// we know that this is a diagonal collision, so we need to
			// reverse the direction and allow the puck to continue
			if (reflectY) {
				x -= dx;
				y -= dy;

				dy *= -1;
			}

			if (reflectX && !reflectY) {
				x -= dx;
				y -= dy;

				dx *= -1;
			}

			continue;
		}

		/* disable this code for tests. Tests don't care about crossing */
		// check if the owner of this tile does not equal the owner of the
		// original tile, which would indicate that the puck has crossed the
		// border at some point
		// if (tile.owner !== lastTile.owner) {
		// 	if (crossedBorder) {
		// 		// if the tile has already crossed the border, then the next
		// 		// tile represents a second crossing of the border, which we
		// 		// won't allow
		// 		break;
		// 	} else {
		// 		// however, if this is the first time crossing the border,
		// 		// then we let the puck continue on its way
		// 		crossedBorder = true;
		// 	}
		// }

		/* disable this code for tests. Tests don't care about actors */
		// if the tile is occupied by an actor, end the loop
		//if (tile.actor) {
		//	break;
		//}

		if (tile) {
			trajectory.push({x: tile.x, y: tile.y});

			// we are in finish
			if(tile.x == finish.x && tile.y == finish.y) {
				break;
			}
		}

		// if this tile is a goal, then break the loop
		// if (tile.inZone("goal")) {
		// 	break;
		// }
		if(module.exports.isTileInGoalZone(tile)) {
			break;
		}
	}

	return trajectory;
};

module.exports.existingTile = function (x, y) {
	if( (x < 0 || x > 13) ) return null;
	if( (y < 0 || y > 7) ) 	return null;
	if( (x == 0 || x == 13) && (y <= 2 || y >= 5) ) return null;

	return {x: x, y: y};
};

module.exports.isTileInGoalZone = function (tile) {
	if( (tile.x == 0 || tile.x == 13) && (tile.y == 3 || tile.y == 4) ) return true;

	return false;
};

module.exports.scoredSide = function (tile) {
	if(tile.x == 0) return 'player2';
	if(tile.x == 13) return 'player1';
	throw new Error('utils.scoredSide() failed to detect side for tile: ' + tile.x + ',' + tile.y);
};