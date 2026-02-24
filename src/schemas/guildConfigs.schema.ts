import mongoose, { Schema } from 'mongoose';

// export type ModuleName = 'valorant' | 'logging';
export type ModuleData = Record<string, boolean>;

/**
 * Type for the GuildConfig Schema
 * Holds configuration options for specific guilds
 */
export type GuildConfigData = {
	/**
	 * The Guild ID for these configs, used for indexing
	 * @example 123456789
	 */
	guildID: string;

	/**
	 * A dictionary of all the enabled modules for this guild
	 * @example { "logging": true }
	 */
	modules: ModuleData;

	/**
	 * A dictionary storing the reaction messages information for this guild
	 * @TODO: create a type for this later
	 */
	reactionMessages: any;

	/**
	 * A dictionary storing the valorant roles configuration for this guild
	 * The key is the role name, with the value being the role ID for this guild
	 * @TODO: create a type for this later
	 * @example { "bronze": "123456789" }
	 */
	valorantRoles: Record<string, string>;

	/**
	 * The channel that should be used for logging
	 * @TODO: not used yet, but here for future-proofing
	 * @example 123456789
	 */
	loggingChannelID: string;
};

// Schema type
const GuildConfigSchema: Schema = new Schema<GuildConfigData>(
	{
		guildID: { type: String, required: true },

		modules: { type: {}, required: false }, // The modules enabled for the guild

		reactionMessages: { type: {}, required: false }, // Contains the reaction message
		valorantRoles: { type: {}, required: false }, // Contains the valorant role data

		loggingChannelID: { type: String, required: false } // The logging channel
	},
	{ minimize: false } // Allow storing empty objects
);

export default mongoose.model<GuildConfigData>('guildconfigs', GuildConfigSchema);
