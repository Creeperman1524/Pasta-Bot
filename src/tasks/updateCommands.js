const { logger } = require('../logging.js');
const { readFromDatabase, writeToDatabase } = require('../util/database.js');
const deployCommands = require('../deploy-commands.js');
const { commandRefreshInterval } = require('../config.json');

module.exports = {
	name: 'updateCommands',
	mode: 'ONCE',

	// Refreshes commands on startup
	async execute(client) {
		const data = readFromDatabase();

		const currentTime = Date.now();

		// Refreshes commands only if it hasn't within the last 30 minutes
		if(data.commandUpdate < currentTime) {
			await deployCommands.execute(client);
			data.commandUpdate = currentTime + (commandRefreshInterval * 60000);

			// Updates time
			writeToDatabase(data);
		} else {
			logger.child({ mode: 'DEPLOY' }).info('Commands will be refreshed on startup in ' + Math.floor((data.commandUpdate - currentTime) / 60000) + ' minutes');
		}
	},
};