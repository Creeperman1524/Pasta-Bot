const { logger } = require('../logging.js');

/**
 * Logs some information about the data being saved and saves it to the database
 * @param {mongoose.model} schema The schema which to save to the database
 */
function writeToDatabase(schema, type) {
	logger.child({ mode: 'DATABASE', metaData: {
		id: schema.id,
		type: {
			botID: schema.botID,
			guildID: schema.guildId,
			userID: schema.userID,
			type: this.type,
		},
	},
	}).info(`Saving information of type '${type}'`);
	schema.save();
}

module.exports = {
	writeToDatabase,
};