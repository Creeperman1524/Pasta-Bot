import { logger } from '../logging';
import deployCommands from '../deploy-commands';
import { commandRefreshInterval } from '../config.json';
import { TaskOnce } from '../util/types/task.js';

import database from '../util/database';
import botConfig from '../schemas/botConfigs.schema';

export default {
	name: 'updateCommands',
	mode: 'ONCE',

	// Refreshes commands on startup
	async execute(client) {
		const currentTime = Date.now();

		// Reads from the database
		const data = await botConfig.findOne({ botID: process.env.clientID });

		// If the data doesn't exist, create one
		if (!data) {
			logger.child({ mode: 'DATABASE' }).warn('Bot configs not saved, creating a new one');
			const saveTime = await botConfig.create({
				botID: process.env.clientID,
				commandsLastUpdated: Date.now()
			});
			database.writeToDatabase(saveTime, 'CREATED BOT TIME');
			return;
		}

		// Refreshes commands only if it hasn't within the last 30 minutes
		if (parseInt(data.commandsLastUpdated) < currentTime) {
			await deployCommands.execute(client);

			// Updates time to the database
			const updatedTime = await botConfig.findOneAndUpdate(
				{ botID: process.env.clientID },
				{ commandsLastUpdated: currentTime + parseInt(commandRefreshInterval) * 60000 }
			);
			if (!updatedTime) return;
			database.writeToDatabase(updatedTime, 'UPDATED BOT TIME');
		} else {
			logger
				.child({ mode: 'DEPLOY' })
				.info(
					`Commands will be refreshed on startup in ${Math.floor((parseInt(data.commandsLastUpdated) - currentTime) / 60000)} minutes`
				);
		}
	}
} as TaskOnce;
