import mongoose, { Schema, Document } from 'mongoose';

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
};

// Document type
export interface IBotConfig extends BotConfigData, Document<string> {}

// Schema type
const BotConfigSchema: Schema = new Schema({
	botID: { type: String, required: true, unique: true },
	commandsLastUpdated: { type: String, required: true }
});

export default mongoose.model<IBotConfig>('botconfigs', BotConfigSchema);
