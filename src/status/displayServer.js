const mcping = require('mcping-js');

const { mcServerPort } = require('../config.json');

module.exports = {
	name: 'displayServer',

	// Returns the status info on the minecraft server
	async execute() {
		const server = new mcping.MinecraftServer(process.env.mcServerIP, mcServerPort);

		let activity = '';
		let status = 'dnd';

		return new Promise((resolve) => {

			// Pings the server for information
			server.ping(1000, 758, (err, res) => {
				// Server offline/errored
				if (!(typeof err === 'undefined' || err === null)) {
					// console.log(err);
					resolve(['an offline server :(', 'dnd']);
					return;
				}

				// Server online with no players
				if (typeof res.players.sample === 'undefined') {
					status = 'idle';
					activity = res.players.online + '/' + res.players.max + ' players';
				}

				// Gets the online players
				let onlinePlayers = [];

				// Server online with players
				if (!(typeof res.players.sample === 'undefined')) {
					status = 'online';

					for (let i = 0; i < res.players.sample.length; i++) {
						onlinePlayers.push(res.players.sample[i].name);
					}
					onlinePlayers = onlinePlayers.sort().join(', ');

					activity = res.players.online + '/' + res.players.max + ' players -\n ' + onlinePlayers;
				}

				// Returns the information on the server
				resolve([activity, status]);
			});
		});
	},
};