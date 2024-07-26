const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const database = require('../../util/database.js');
const valorantConfigSchema = require('../../schemas/valorantConfig.js');
const guildConfigSchema = require('../../schemas/guildConfigs.js');

const header = {
	'Authorization': process.env.valorantToken,
};

async function linkCommand(interaction) {
	const fetchingEmbed = newEmbed()
		.setTitle('Fetching data...')
		.setColor(colors.valorantCommand)
		.setDescription('Fetching valorant data...');

	await interaction.editReply({
		embeds: [fetchingEmbed],
	});

	let data = await valorantConfigSchema.findOne({ userID: interaction.user.id });

	// Checks to see if the user is in the databse
	if(!data) {
		logger.child({ mode: 'DATABASE', metaData: { userID: interaction.user.id } }).info('Creating new valorant config');
		const valorantConfig = await valorantConfigSchema.create({
			userID: interaction.user.id,
		});
		database.writeToDatabase(valorantConfig, 'NEW VALORANT CONFIG');

		data = await valorantConfigSchema.findOne({ userID: interaction.user.id });
	}

	// Checks the format of the provided account
	const input = interaction.options.getString('account');

	const regex = /^(?<name>.{3,16})#(?<tagline>.{3,5})$/;
	const match = input.match(regex);

	if(match == null) {
		// Incorrect format
		const formatErrorEmbed = newEmbed()
			.setTitle('Incorrect Format!')
			.setColor(colors.warn)
			.setDescription(`The account \`${input}\` has an invalid format. Please use the format of \`<name>#<tagline>\``);

		await interaction.editReply({
			embeds: [formatErrorEmbed],
		});

		return;
	}

	const name = match.groups.name;
	const tagline = match.groups.tagline;

	// Searches the account for the PUUID
	const userResponse = await fetch(`https://api.henrikdev.xyz/valorant/v2/account/${name}/${tagline}`,
		{ method: 'GET', headers: header },
	);
	const accountData = await userResponse.json();

	// Something has gone wrong
	if(accountData.errors || accountData.status != 200) {
		logger.child({ mode: 'VALORANT ROLE', metaData: { userID: interaction.user.id } }).error(accountData);
		let description = '';

		switch(accountData.errors[0].code) {
		case 22:
			description = `The account \`${name}#${tagline}\` is invalid. Please use \`/valorant link\` to link a correct account.`;
			break;
		case 24:
			description = 'This account does not have enough match data. Play more games and try again later!';
			break;
		default:
			description = 'Someting went horribly wrong! Please contact the owner for more information.';
			break;
		}

		const errorEmbed = newEmbed()
			.setTitle('Something went wrong!')
			.setColor(colors.error)
			.setDescription(description);

		await interaction.editReply({
			embeds: [errorEmbed],
		});
		return;
	}

	const PUUID = accountData.data.puuid;

	// Saves the account information to the valorant config
	const newValorantConfig = await valorantConfigSchema.findOneAndUpdate({ userID: interaction.user.id }, {
		puuid: PUUID,
	});
	database.writeToDatabase(newValorantConfig, 'UPDATED VALORANT CONFIG');

	const confirmationEmbed = newEmbed()
		.setTitle('Account Linked!')
		.setColor(colors.valorantCommand)
		.setDescription(`Your discord account is now linked with the account \`${input}\``);

	await interaction.editReply({
		embeds: [confirmationEmbed],
	});
}

async function updateRole(interaction) {
	const userData = await valorantConfigSchema.findOne({ userID: interaction.user.id });

	// Checks if the user's account is linked
	if(!userData) {
		const noUserDataEmbed = newEmbed()
			.setTitle('Account not linked!')
			.setColor(colors.warn)
			.setDescription('Your account is not linked! Please use `/valorant link` to link your riot games account.');

		await interaction.editReply({
			embeds: [noUserDataEmbed],
		});

		return;
	}

	const fetchingEmbed = newEmbed()
		.setTitle('Fetching data...')
		.setColor(colors.valorantCommand)
		.setDescription('Fetching valorant data...');

	await interaction.editReply({
		embeds: [fetchingEmbed],
	});

	const PUUID = userData.puuid;

	// Finds the current rank of the account
	const rankResponse = await fetch(`https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/na/pc/${PUUID}`,
		{ method: 'GET', headers: header },
	);

	let rankData = await rankResponse.json();

	// Something has gone wrong
	if(rankData.errors || rankData.status != 200) {
		logger.child({ mode: 'VALORANT ROLE', metaData: { userID: interaction.user.id } }).error(rankData);

		const errorEmbed = newEmbed()
			.setTitle('Something went wrong!')
			.setColor(colors.error)
			.setDescription('Something went horribly wrong! Please contact the owner for more information.');

		await interaction.editReply({
			embeds: [errorEmbed],
		});
		return;
	}

	// Finds the data for the valorant roles
	rankData = rankData.data;
	const rank = rankData.current.tier.name;
	const rankRoleName = rank.split(' ')[0].toLowerCase();

	const guildData = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	// No guild configs exist for this rank
	if(!guildData || !guildData.valorantRoles || (!guildData.valorantRoles[rankRoleName] && rank != 'Unrated')) {
		const noConfigEmbed = newEmbed()
			.setTitle('Role not set!')
			.setColor(colors.warn)
			.setDescription(`Your current rank \`${rank}\` does not have a role set to it! **Please contact your server admin.**`);

		await interaction.editReply({
			embeds: [noConfigEmbed],
		});
	}

	// Removes all other rank roles
	const guildMember = await interaction.guild.members.fetch(interaction.user.id);
	const rolesToRemove = [];

	for(const rankRoleId of Object.values(guildData.valorantRoles)) {
		const roleToRemove = await interaction.guild.roles.fetch(rankRoleId);

		// The role doesn't exist in the server but exists in the database, meaning it was deleted
		if(!roleToRemove) {
			// TODO: autofix broken role by removing it from the database

			logger.child({ mode: 'VALORANT ROLE', metaData: { userId: interaction.user.id, guildId: interaction.guildId } }).error(`Rank role '${rankRoleId}' in guild ${interaction.guildId} has desynced`);
			const desyncedRoleEmbed = newEmbed()
				.setTitle('Roles misconfigured!')
				.setColor(colors.error)
				.setDescription('It seems a role is misconfigured. Please contact your server admin.');

			await interaction.editReply({
				embeds: [desyncedRoleEmbed],
			});

			return;
		}

		rolesToRemove.push(roleToRemove);
	}
	await guildMember.roles.remove(rolesToRemove);

	// Adds the rank role to the user
	const roleToAdd = await interaction.guild.roles.fetch(guildData.valorantRoles[rankRoleName]);

	// All roles should be checked from above, so if it's missing it's most likely an unrated role
	if(!roleToAdd) {
		const unratedEmbed = newEmbed()
			.setTitle('Updated role')
			.setColor(colors.valorantCommand)
			.setDescription('Your rank is currently **Unrated**, go grind some more to earn a role!');

		await interaction.editReply({
			embeds: [unratedEmbed],
		});

		return;
	}

	await guildMember.roles.add(roleToAdd);

	const addedRoleEmbed = newEmbed()
		.setTitle('Updated role')
		.setColor(colors.valorantCommand)
		.setDescription(`Your rank of **${rank}** has earned you the role of <@&${roleToAdd.id}>`);

	await interaction.editReply({
		embeds: [addedRoleEmbed],
	});

}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('valorant')
		.setDescription('Commands dealing with Valorant')

		// link account
		.addSubcommand(subcommand => subcommand
			.setName('link')
			.setDescription('Link your discord account to a riot id')
			.addStringOption(option => option
				.setName('account')
				.setDescription('Your riot ID in the format <name>#<tagline>')
				.setRequired(true),
			),
		)

		// update role
		.addSubcommand(subcommand => subcommand
			.setName('update-role')
			.setDescription('Update your valorant rank for servers which have roles based on rank'),
		),

	category: 'valorant',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
		case 'link':
			linkCommand(interaction);
			break;
		case 'update-role':
			updateRole(interaction);
			break;
		}
	},
};
