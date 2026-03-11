import mongoose from 'mongoose';
import { logger } from '../logging';
import { TaskOnce } from '../util/types/task.js';

export default {
	name: 'databaseConnection',
	mode: 'ONCE',

	async execute() {
		// Connects to the database
		const connectionString = process.env.mongoDB;
		if (!connectionString) {
			logger.child({ mode: 'DATABASE' }).error('Missing connection string for MongoDB');
			return;
		}

		mongoose.Promise = global.Promise;
		mongoose.set('strictQuery', true);
		await mongoose.connect(connectionString, {});
	}
} as TaskOnce;

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
