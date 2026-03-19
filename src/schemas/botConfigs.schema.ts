import mongoose, { Schema } from 'mongoose';

/**
 * Type for the BotConfig Schema
 * Holds configuration options for the bots themselves
 * @TODO: Tranfer config options from config.json to the database
 */
export type BotConfigData = {
	/**
	 * The currnet botID, used for indexing and separation of bots in the DB
	 * @example 123456789
	 */
	botID: string;

	/**
	 * A string of epoch time when the commands were last updated, in milliseconds
	 * @example 1767225600000
	 */
	commandsLastUpdated: string;

	/**
	 * A string of the default minecraft server IP the /server command should target
	 * This is automatically set by the bot from the .env file if the value does not exist
	 * @example 192.168.1.1 or hypixel.net
	 */
	mcServerIP?: string;

	/**
	 * A string of the default minecraft server seed the /server seed command should output
	 * This is automatically set by the bot from the .env file if the value does not exist
	 * @example 1234567890
	 */
	mcServerSeed?: string;

	/**
	 * A string of the default minecraft server port the /server command should target
	 * This is automatically set by the bot from the .env file if the value does not exist
	 * @example 25565
	 */
	mcServerPort?: string;

	/**
	 * A string of the default minecraft server port the /server info should output
	 * This is automatically set by the bot from the .env file if the value does not exist
	 * @example 1.21.1
	 */
	mcServerVersion?: string;
};

// Schema type
const BotConfigSchema: Schema = new Schema<BotConfigData>({
	botID: { type: String, required: true, unique: true },
	commandsLastUpdated: { type: String, required: true },

	mcServerIP: { type: String, required: false },
	mcServerSeed: { type: String, required: false },
	mcServerPort: { type: String, required: false },
	mcServerVersion: { type: String, required: false }
});

export default mongoose.model<BotConfigData>('botconfigs', BotConfigSchema);
