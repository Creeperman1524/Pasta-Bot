const { logger } = require('../logging');
const fs = require('fs');
const { statusInterval } = require('../config.json');

const functions = [];
const statusFiles = fs.readdirSync('./src/status');

// Gather activity files from folder
for (const file of statusFiles) {
	const func = require(`../status/${file}`);
	functions.push(func);
}

// Loop index
let i = 0;

function iterateCounter(presences) {
	i++; // Initially increment the counter
	// Skip over the server status if there are no players online (as long as there are more statuses to be shown)
	if (Object.keys(presences)[i] == 'displayServer' && presences['displayServer'][1] !== 'online' && functions.length > 1) {
		i++;
	}
	// Overflow check
	if (i > functions.length - 1) i = 0;
}

module.exports = {
	name: 'statusSystem',
	mode: 'INTERVAL',
	interval: statusInterval,

	async execute(client) {
		// The presence that will be displayed
		const botPresence = ['', 'dnd'];

		// Stores what all of the functions want to be displayed
		const presences = {};
		for (const func of functions) {
			presences[func.name] = await func.execute(client);
		}

		// Always display's the status as the server's status
		botPresence[1] = presences['displayServer'][1];

		// Displays the function on this cycle
		botPresence[0] = presences[Object.keys(presences)[i]][0];

		// Iterates the counter
		iterateCounter(presences);

		// Set's the bot's presence
		client.user.setPresence({
			activities: [{
				name: botPresence[0],
				type: 'WATCHING',
			}],
			status: botPresence[1],
		});
		// logger.child({ mode: 'STATUS' }).debug(`Status has been updated with status '${botPresence[1]}' and activity '${botPresence[0]}'`);
	},
};
