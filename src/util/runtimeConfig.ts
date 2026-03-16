import {
	mcServerPort as defaultMcServerPort,
	mcServerVersion as defaultMcServerVersion
} from '../config.json';
import { logger } from '../logging';
import botConfig from '../schemas/botConfigs.schema';
import database from './database';

const MINECRAFT_CONFIG_CACHE_TTL_MS = 60000;

export type MinecraftRuntimeConfig = {
	mcServerIP: string;
	mcServerSeed: string;
	mcServerPort: string;
	mcServerVersion: string;
};

let minecraftConfigCache: MinecraftRuntimeConfig | null = null;
let minecraftConfigCacheTimestamp = 0;

function getLegacyMinecraftDefaults(): MinecraftRuntimeConfig {
	return {
		mcServerIP: process.env.mcServerIP ?? '',
		mcServerSeed: process.env.mcServerSeed ?? '',
		mcServerPort: defaultMcServerPort,
		mcServerVersion: defaultMcServerVersion
	};
}

async function upsertBotConfigWithLegacyDefaults() {
	const botID = process.env.clientID;
	if (!botID) {
		logger.child({ mode: 'DATABASE' }).error('Missing bot clientID for runtime config lookups');
		throw new Error('Missing bot clientID for runtime config');
	}

	const legacyDefaults = getLegacyMinecraftDefaults();
	const data = await botConfig.findOne({ botID });

	if (!data) {
		logger
			.child({ mode: 'DATABASE' })
			.warn('Bot configs not saved, creating config with legacy Minecraft defaults');
		const createdConfig = await botConfig.create({
			botID,
			commandsLastUpdated: Date.now().toString(),
			...legacyDefaults
		});
		database.writeToDatabase(createdConfig, 'CREATED BOT CONFIG WITH MINECRAFT SETTINGS');
		return createdConfig;
	}

	const updates: Partial<MinecraftRuntimeConfig> = {};
	if (!data.mcServerIP && legacyDefaults.mcServerIP)
		updates.mcServerIP = legacyDefaults.mcServerIP;
	if (!data.mcServerSeed && legacyDefaults.mcServerSeed)
		updates.mcServerSeed = legacyDefaults.mcServerSeed;
	if (!data.mcServerPort && legacyDefaults.mcServerPort)
		updates.mcServerPort = legacyDefaults.mcServerPort;
	if (!data.mcServerVersion && legacyDefaults.mcServerVersion)
		updates.mcServerVersion = legacyDefaults.mcServerVersion;

	if (Object.keys(updates).length == 0) return data;

	const updatedConfig = await botConfig.findOneAndUpdate({ botID }, updates, { new: true });
	if (!updatedConfig) throw new Error('Failed to update bot runtime config from legacy defaults');
	database.writeToDatabase(updatedConfig, 'UPDATED BOT CONFIG WITH MINECRAFT SETTINGS');
	return updatedConfig;
}

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

export async function getMinecraftRuntimeConfig(
	forceRefresh = false
): Promise<MinecraftRuntimeConfig> {
	const cacheIsValid =
		minecraftConfigCache &&
		Date.now() - minecraftConfigCacheTimestamp < MINECRAFT_CONFIG_CACHE_TTL_MS;

	if (!forceRefresh && cacheIsValid && minecraftConfigCache) return minecraftConfigCache;

	const data = await upsertBotConfigWithLegacyDefaults();
	const config = {
		mcServerIP: data.mcServerIP ?? '',
		mcServerSeed: data.mcServerSeed ?? '',
		mcServerPort: data.mcServerPort ?? '',
		mcServerVersion: data.mcServerVersion ?? ''
	};

	validateMinecraftConfig(config);
	minecraftConfigCache = config;
	minecraftConfigCacheTimestamp = Date.now();
	return config;
}

export function invalidateMinecraftRuntimeConfigCache() {
	minecraftConfigCache = null;
	minecraftConfigCacheTimestamp = 0;
}
