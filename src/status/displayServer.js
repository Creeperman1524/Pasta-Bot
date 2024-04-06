const mcping = require('mcping-js');

const { mcServerPort } = require('../config.json');

module.exports = {
	name: 'displayServer',

	// Returns the status info on the minecraft server
	async execute() {
		const server = new mcping.MinecraftServer(process.env.mcServerIP, mcServerPort);
		return new Promise((resolve) => {

			// Pings the server for information
			server.ping(1000, 765, (err, res) => {

				// Server offline/errored
				if (!(typeof err === 'undefined' || err === null)) {
					// console.log(err);
					resolve(['an offline server :(', 'dnd']);
					return;
				}

				// Server online with no players
				if (typeof res.players.sample === 'undefined') {
					resolve([res.players.online + '/' + res.players.max + ' players', 'idle']);
					return;
				}

				// Server is in sleep mode
				if(res.players.sample.length == 0) {
					resolve(['a sleepy server', 'idle']);
					return;
				}

				// Gets the online players
				let onlinePlayers = [];

				// Server online with players
				if (!(typeof res.players.sample === 'undefined')) {

					for(const player of res.players.sample) onlinePlayers.push(player.name);
					onlinePlayers = onlinePlayers.sort().join(', ');

					resolve([res.players.online + '/' + res.players.max + ' players -\n ' + onlinePlayers, 'online']);
					return;
				}
			});
		});
	},
};