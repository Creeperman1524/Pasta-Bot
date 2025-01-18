const mongoose = require('mongoose');
const { logger } = require('../logging.js');

module.exports = {
	name: 'databaseConnection',
	mode: 'ONCE',

	async execute() {
		// Connects to the database
		mongoose.Promise = global.Promise;
		mongoose.set('strictQuery', true);
		await mongoose.connect(process.env.mongoDB, {});
	},
};

// Alerts about connection, outages, and errors
mongoose.connection.once('connected', () => {
	logger.child({ mode: 'DATABASE' }).info('Connected to database');
});

mongoose.connection.once('disconnected', () => {
	logger.child({ mode: 'DATABASE' }).warn('Disconnected from the database');
});

mongoose.connection.once('reconnected', () => {
	logger.child({ mode: 'DATABASE' }).info('Reconnected to the database');
});

mongoose.connection.on('error', (error) => {
	logger.child({ mode: 'DATABASE' }).error(error);
});
