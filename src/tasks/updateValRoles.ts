import { logger } from '../logging';

import valorantConfigSchema from '../schemas/valorantConfig.schema';
import guildConfigSchema, { GuildConfigData } from '../schemas/guildConfigs.schema';

import { apiRetries } from '../config.json';
import { TaskTime } from '../util/types/task.js';
import { GuildMember, Role } from 'discord.js';

const header: HeadersInit = {
	Authorization: process.env.valorantToken || ''
};

// From https://docs.henrikdev.xyz/valorant/api-reference/mmr
type ResponseData = RankData | ErrorResponse;

type RankData = {
	status: 200;
	data: {
		current: {
			tier: {
				name: string;
			};
		};
	};
};

type ErrorResponse = {
	status: number;
	errors: {
		message: string;
		code: number;
		details: string;
	};
};

module.exports = {
	name: 'updateValRoles',
	mode: 'TIME',
	timeHour: 0,
	timeMinutes: 0,

	async execute(client) {
		logger.child({ mode: 'AUTO VALORANT ROLE' }).info('Running auto valorant role...');

		for (const guildData of await guildConfigSchema.find()) {
			// The server does not have valorant roles enabled/no roles set
			if (
				!guildData.modules ||
				!guildData.modules['valorant-roles'] ||
				!guildData.valorantRoles
			)
				continue;

			const guild = await client.guilds.fetch(guildData.guildID);
			const members = await guild.members.fetch();

			// Loops through each member of the server to update their role
			for (const guildMember of members) {
				await updateUser(guildMember[1], guildData);
			}
		}
	}
} as TaskTime;

async function updateUser(guildMember: GuildMember, guildData: GuildConfigData) {
	const userData = await valorantConfigSchema.findOne({ userID: guildMember.user.id });

	// No configs set
	if (!userData) return;

	const PUUID = userData.puuid;

	const rankDataResponse = await getRankData(PUUID);

	// Something has gone wrong
	if (!rankDataResponse) return;

	const rankData = rankDataResponse.data;
	const rank = rankData.current.tier.name;
	const rankRoleName = rank.split(' ')[0].toLowerCase();

	// Removes all other rank roles
	const rolesToRemove = [] as Role[];

	for (const rankRoleId of Object.values(guildData.valorantRoles)) {
		const roleToRemove = await guildMember.guild.roles.fetch(rankRoleId);

		// The role doesn't exist in the server but exists in the database, meaning it was deleted
		if (!roleToRemove) return;
		rolesToRemove.push(roleToRemove);
	}
	await guildMember.roles.remove(rolesToRemove);

	// Adds the rank role to the user
	const roleToAdd = await guildMember.guild.roles.fetch(guildData.valorantRoles[rankRoleName]);

	// All roles should be checked from above, so if it's missing it's most likely an unrated role
	if (!roleToAdd) return;

	await guildMember.roles.add(roleToAdd);
	logger
		.child({
			mode: 'AUTO VALORANT ROLE',
			metaData: { userID: guildMember.user.id, guildID: guildMember.guild.id }
		})
		.debug(`Updated '${guildMember.user.username}' in '${guildMember.guild.name}'`);
}

// Finds the current rank of the account
async function getRankData(PUUID: string): Promise<RankData | null> {
	let rankData: ResponseData;
	let retries = 0;

	// Tries to get the rank
	while (retries < apiRetries) {
		const rankResponse = await fetch(
			`https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/na/pc/${PUUID}`,
			{ method: 'GET', headers: header }
		);

		rankData = rankResponse ? await rankResponse.json() : null;

		// Someting has gone wrong
		if (rankData.status !== 200) {
			if (rankData.status == 429) {
				// Rate limited, try again in a minute
				logger
					.child({ mode: 'AUTO VALORANT ROLE' })
					.warn('Rate limited, trying again in 1 minute...');
				logger.child({ mode: 'AUTO VALORANT ROLE' }).warn(rankData);
			} else {
				// Some other error
				logger
					.child({ mode: 'AUTO VALORANT ROLE' })
					.error('Errored, trying again in 1 minute...');
				logger.child({ mode: 'AUTO VALORANT ROLE' }).error(rankData);
			}

			// Waits for a minute before trying again
			retries++;
			await sleep(1 * 60 * 1000);
			continue;
		}

		return rankData as RankData;
	}

	logger
		.child({ mode: 'AUTO VALORANT ROLE' })
		.warn('Exceeded rate limit/errored too many times, aborting...');

	return null;
}

// A function to pause for a certain amount of time
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
