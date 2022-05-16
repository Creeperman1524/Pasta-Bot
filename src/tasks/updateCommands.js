const { logger } = require('../logging.js');
const fs = require('fs');

const deployCommands = require('../deploy-commands.js');
const { commandRefreshInterval } = require('../config.json');

module.exports = {
	name: 'updateCommands',
	mode: 'ONCE',

	// Refreshes commands on startup
	async execute(client) {
		const raw = fs.readFileSync('./src/storage.json');
		const data = JSON.parse(raw);

		const currentTime = Date.now();

		// Refreshes commands only if it hasn't within the last 30 minutes
		if(data.commandUpdate < currentTime) {
			await deployCommands.execute(client);
			data.commandUpdate = currentTime + (commandRefreshInterval * 60000);

			// Updates time
			fs.writeFileSync('./storage.json', JSON.stringify(data));
		} else {
			logger.child({ mode: 'DEPLOY' }).info('Commands will be refreshed on startup in ' + Math.floor((data.commandUpdate - currentTime) / 60000) + ' minutes');
		}
	},
};