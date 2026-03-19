import mongoose from 'mongoose';
import { logger } from '../logging';
import { TaskOnce } from '../util/types/task.js';

const MAX_CONNECTION_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
	name: 'databaseConnection',
	mode: 'ONCE',
	priority: 100,

	async execute() {
		// Checks for database string
		const connectionString = process.env.mongoDB;
		if (!connectionString) {
			logger.child({ mode: 'DATABASE' }).error('Missing connection string for MongoDB');
			logger.child({ mode: 'DATABASE' }).error('Fatal: bot cannot start without a database');
			process.exit(1);
		}

		// Mongoose settings
		mongoose.Promise = global.Promise;
		mongoose.set('strictQuery', true);

		// Attempts to connect to the database
		// Uses exponential backoff to not overwhelm the server
		for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
			try {
				logger
					.child({
						mode: 'DATABASE',
						metaData: { attempt, maxAttempts: MAX_CONNECTION_ATTEMPTS }
					})
					.info(`Connecting to MongoDB (${attempt}/${MAX_CONNECTION_ATTEMPTS})...`);
				await mongoose.connect(connectionString, {});
				return;
			} catch (error) {
				logger
					.child({
						mode: 'DATABASE',
						metaData: { attempt, maxAttempts: MAX_CONNECTION_ATTEMPTS }
					})
					.error(error);
				if (attempt == MAX_CONNECTION_ATTEMPTS) {
					logger
						.child({ mode: 'DATABASE' })
						.error(
							`Fatal: failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts; exiting`
						);
					process.exit(1);
				}

				const retryDelay = Math.min(
					INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
					MAX_RETRY_DELAY_MS
				);
				logger
					.child({ mode: 'DATABASE', metaData: { retryDelay } })
					.warn(`MongoDB connection failed, retrying in ${retryDelay}ms`);
				await wait(retryDelay);
			}
		}
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
