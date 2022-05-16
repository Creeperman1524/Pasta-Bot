const { logger } = require('../logging.js');
const mcping = require('mcping-js');

const { mcServerIP } = require('../hidden.json');
const { mcServerPort } = require('../config.json');

module.exports = {
	name: 'displayServer',
	mode: 'INTERVAL',
	interval: '20',

	// Updates the bot's status periodically
	async execute(client) {
		const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

		let activity = '';
		let status = 'dnd';

		server.ping(1000, 758, (err, res) => {
		// Server offline
			if (!(typeof err === 'undefined' || err === null)) {

				client.user.setPresence({
					activities: [{
						name: 'an offline server :(',
						type: 'WATCHING',
					}],
					status: 'dnd',
				});
				logger.child({ mode: 'STATUS' }).debug('Status has been updated with status \'dnd\' and activity \'an offline server :(\'');
				// console.log(err);
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

			// Sets the activity to the amount of players on the server
			client.user.setPresence({
				activities: [{
					name: activity,
					type: 'WATCHING',
				}],
				status: status,
			});
			logger.child({ mode: 'STATUS' }).debug(`Status has been updated with status '${status}' and activity '${activity}'`);
		});
	},
};