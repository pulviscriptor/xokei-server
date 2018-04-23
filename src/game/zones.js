// in this file we will calculate zones of tiles on server startup
// to access them while building tiles for boards

var zones = {
	player1: {
		endZone: [
			{
				x: 1,
				y: 2
			},
			{
				x: 2,
				y: 5
			}
		],

		goal: [
			{
				x: 0,
				y: 3
			},
			{
				x: 0,
				y: 4
			}
		],

		territory: [
			{
				x: 1,
				y: 0
			},
			{
				x: 6,
				y: 7
			}
		]
	},
	player2: {
		endZone: [
			{
				x: 11,
				y: 2
			},
			{
				x: 12,
				y: 5
			}
		],

		goal: [
			{
				x: 13,
				y: 3
			},
			{
				x: 13,
				y: 4
			}
		],

		territory: [
			{
				x: 7,
				y: 0
			},
			{
				x: 12,
				y: 7
			}
		]
	}
};

function zonesOfCoordinates(x, y) {
	var ret = [];

	for(var side in zones) {
		for(var zone in zones[side]) {
			var zone_start_x = zones[side][zone][0].x;
			var zone_start_y = zones[side][zone][0].y;
			var zone_end_x = zones[side][zone][1].x;
			var zone_end_y = zones[side][zone][1].y;

			if(x >= zone_start_x && x <= zone_end_x && y >= zone_start_y && y <= zone_end_y) {
				ret.push(side);
				ret.push(side + '_' + zone);
				ret.push(zone);
			}
		}
	}

	return ret;
}

// building zones so we can use them in board.js
for(var x=0;x<=13;x++) {
	module.exports[x] = [];
	for(var y=0;y<=7;y++) {
		module.exports[x][y] = zonesOfCoordinates(x, y);
	}
}