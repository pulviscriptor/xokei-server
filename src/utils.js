module.exports.generateClientID = function (server) {
	var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

	do {
		var ret = '';
		for (var i = 0; i < 8; i++) {
			var pos = Math.floor(Math.random() * chars.length);
			ret += chars[pos];
		}
	} while (server.clients[ret]);

	return ret;
};

module.exports.generateRoomID = function (server) {
	var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

	do {
		var ret = '';
		for (var i = 0; i < 6; i++) {
			var pos = Math.floor(Math.random() * chars.length);
			ret += chars[pos];
		}
	} while (server.rooms[ret]);

	return ret;
};