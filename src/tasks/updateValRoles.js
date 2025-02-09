const { logger } = require('../logging.js');

const valorantConfigSchema = require('../schemas/valorantConfig.js');
const guildConfigSchema = require('../schemas/guildConfigs.js');

const { apiRetries } = require('../config.json');

const header = {
	'Authorization': process.env.valorantToken,
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
			if (!guildData.modules || !guildData.modules['valorant-roles'] || !guildData.valorantRoles) continue;

			const guild = await client.guilds.fetch(guildData.guildID);
			const members = await guild.members.fetch();

			// Loops through each member of the server to update their role
			for (const guildMember of members) {
				updateUser(guildMember[1], guildData);
			}
		}

	},

};

async function updateUser(guildMember, guildData) {
	const userData = await valorantConfigSchema.findOne({ userID: guildMember.user.id });

	// No configs set
	if (!userData) return;

	const PUUID = userData.puuid;

	let rankData = await getRankData(PUUID);

	// Something has gone wrong
	if (!rankData || rankData.errors || rankData.status != 200) return;

	rankData = rankData.data;
	const rank = rankData.current.tier.name;
	const rankRoleName = rank.split(' ')[0].toLowerCase();

	// Removes all other rank roles
	const rolesToRemove = [];

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
	logger.child({ mode: 'AUTO VALORANT ROLE', metaData: { userID: guildMember.user.id, guildID: guildMember.guild.id } }).debug(`Updated '${guildMember.user.username}' in '${guildMember.guild.name}'`);
}

// Finds the current rank of the account
async function getRankData(PUUID) {
	let rankData;
	let retries = 0;

	// Tries to get the rank
	while (retries < apiRetries) {
		const rankResponse = await fetch(`https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/na/pc/${PUUID}`,
			{ method: 'GET', headers: header },
		);

		rankData = rankResponse ? await rankResponse.json() : null;

		// Check for rate limit or other errors
		if (!rankData || (rankData.errors && rankData.errors[0].code == 0 && rankData.errors[0].status == 429)) {
			logger.child({ mode: 'AUTO VALORANT ROLE' }).warn('Rate limited/errored, trying again in 1 minute...');
			logger.child({ mode: 'AUTO VALORANT ROLE' }).warn(rankData);

			// Waits for a minute before trying again
			retries++;
			await sleep(1 * 60 * 1000);
			continue;
		}

		return rankData;
	}

	logger.child({ mode: 'AUTO VALORANT ROLE' }).warn('Exceeded rate limit/errored too many times, aborting...');
	return null;
}

// A function to pause for a certain amount of time
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
