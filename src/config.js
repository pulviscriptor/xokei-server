var config = {
	// log level 0-3
	debug: 3,

	server: {
		// ip address of interface to listen on
		// leave 0.0.0.0 to listen on all interfaces
		host: '0.0.0.0',

		// port to listen on
		port: 9000
	},

	// same length should be set on client
	playerNameLength: 15,

	// rules of the game
	game: {
		// how much scores player should have to win
		scoreToWin: 6,

		// true = looser starts another game
		// false = first player starts another game
		looserStartsAnotherGame: true
	}
};

module.exports = config;
