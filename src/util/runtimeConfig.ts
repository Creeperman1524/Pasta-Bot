import { logger } from '../logging';
import botConfig, { BotConfigData } from '../schemas/botConfigs.schema';
import database from './database';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type MinecraftRuntimeConfig = {
	mcServerIP: string;
	mcServerSeed: string;
	mcServerPort: string;
	mcServerVersion: string;
};

let minecraftConfigCache: MinecraftRuntimeConfig | null = null;
let cacheTimestamp = 0;

/**
 * Gets the minecraft config defaults from the .env file
 * This is used to populate the database if no entry exists
 *
 * If they don't exist in the .env, it defaults to ''
 */
function getEnvDefaults(): MinecraftRuntimeConfig {
	return {
		mcServerIP: process.env.mcServerIP ?? '',
		mcServerSeed: process.env.mcServerSeed ?? '',
		mcServerPort: process.env.mcServerPort ?? '',
		mcServerVersion: process.env.mcServerVersion ?? ''
	};
}

/**
 * Updates the database configuration with the .env defaults
 * if they do not exist in the database
 *
 * @throws Error when the bot clientID is not provided in .env file
 * @throws Error when it fails to update the database config
 */
async function getDBConfigData(): Promise<BotConfigData> {
	const botID = process.env.clientID;
	if (!botID) {
		logger.child({ mode: 'DATABASE' }).error('Missing bot clientID for runtime config lookups');
		throw new Error('Missing bot clientID for runtime config');
	}

	// Gets the bot config
	const defaults = getEnvDefaults();
	const data = await botConfig.findOne({ botID });

	if (!data) {
		logger
			.child({ mode: 'DATABASE' })
			.warn('Bot configs not saved, creating config with legacy Minecraft defaults');
		const createdConfig = await botConfig.create({
			botID,
			commandsLastUpdated: Date.now().toString(),
			...defaults
		});
		database.writeToDatabase(createdConfig, 'CREATED BOT CONFIG WITH MINECRAFT SETTINGS');
		return createdConfig;
	}

	// Makes sure each config exists in the database
	const updates: Partial<MinecraftRuntimeConfig> = {};
	if (!data.mcServerIP && defaults.mcServerIP) updates.mcServerIP = defaults.mcServerIP;
	if (!data.mcServerSeed && defaults.mcServerSeed) updates.mcServerSeed = defaults.mcServerSeed;
	if (!data.mcServerPort && defaults.mcServerPort) updates.mcServerPort = defaults.mcServerPort;
	if (!data.mcServerVersion && defaults.mcServerVersion)
		updates.mcServerVersion = defaults.mcServerVersion;

	if (Object.keys(updates).length == 0) return data;

	// Updates the database with the new defaults
	const updatedConfig = await botConfig.findOneAndUpdate({ botID }, updates, { new: true });
	if (!updatedConfig) throw new Error('Failed to update bot runtime config from legacy defaults');
	database.writeToDatabase(updatedConfig, 'UPDATED BOT CONFIG WITH MINECRAFT SETTINGS');
	return updatedConfig;
}

/**
 * Checks if the minecraft configuration has all the necessary parts
 * @throws Error if a configuration is missing
 */
function validateMinecraftConfig(config: MinecraftRuntimeConfig) {
	if (!config.mcServerIP) {
		logger.child({ mode: 'DATABASE' }).error('Missing Minecraft setting: mcServerIP');
		throw new Error('Missing Minecraft setting: mcServerIP');
	}

	if (!config.mcServerSeed) {
		logger.child({ mode: 'DATABASE' }).error('Missing Minecraft setting: mcServerSeed');
		throw new Error('Missing Minecraft setting: mcServerSeed');
	}

	if (!config.mcServerPort) {
		logger.child({ mode: 'DATABASE' }).error('Missing Minecraft setting: mcServerPort');
		throw new Error('Missing Minecraft setting: mcServerPort');
	}

	if (!config.mcServerVersion) {
		logger.child({ mode: 'DATABASE' }).error('Missing Minecraft setting: mcServerVersion');
		throw new Error('Missing Minecraft setting: mcServerVersion');
	}
}

/**
 * Gets the minecraft configuration, whether from the cache or from the database
 * @param forceRefresh An optional argument to force a refresh from the database when getting the config
 * @returns The minecraft configuration
 */
export async function getMCConfig(forceRefresh = false): Promise<MinecraftRuntimeConfig> {
	const cacheIsValid = minecraftConfigCache && Date.now() - cacheTimestamp < CACHE_TTL_MS;

	if (!forceRefresh && cacheIsValid && minecraftConfigCache) return minecraftConfigCache;

	const data = await getDBConfigData();
	const config = {
		mcServerIP: data.mcServerIP ?? '',
		mcServerSeed: data.mcServerSeed ?? '',
		mcServerPort: data.mcServerPort ?? '',
		mcServerVersion: data.mcServerVersion ?? ''
	};

	validateMinecraftConfig(config);
	minecraftConfigCache = config;
	cacheTimestamp = Date.now();
	return config;
}

/**
 * Invalidates the minecraft runtime configuration cache,
 * so whenever the configs are needed, they are pulled from the database
 */
export function invalidateMCConfigCache() {
	minecraftConfigCache = null;
	cacheTimestamp = 0;
}
