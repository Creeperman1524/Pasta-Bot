import { HydratedDocument } from 'mongoose';
import { logger } from '../logging';

/**
 * Logs some information about the data being saved and saves it to the database
 * @param schema The schema which to save to the database
 * @param type The 'type' that will be printed to the logs
 */
function writeToDatabase<T>(schema: HydratedDocument<T>, type: string) {
	logger
		.child({
			mode: 'DATABASE',
			metaData: {
				id: schema.id,
				type: {
					botID: 'botID' in schema ? schema.botID : null,
					guildID: 'guildID' in schema ? schema.guildID : null,
					userID: 'userID' in schema ? schema.userID : null,
					type: type
				}
			}
		})
		.info(`Saving information of type '${type}'`);
	schema.save();
}

export default {
	writeToDatabase
};
