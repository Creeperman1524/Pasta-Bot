const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { configs } = require('../../config.json');
const { logger } = require('../../logging.js');

const database = require('../../util/database.js');
const guildConfigSchema = require('../../schemas/guildConfigs.js');

async function setConfig(interaction) {
	let data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	// Checks to see if the guild has any configs set yet
	if (!data) {
		logger.child({ mode: 'DATABASE', metaData: { userID: interaction.user.id } }).info('Creating new guild config');
		const guildConfig = await guildConfigSchema.create({
			guildID: interaction.guildId,
		});
		database.writeToDatabase(guildConfig, 'NEW GUILD CONFIG');

		data = await guildConfigSchema.findOne({ guildID: interaction.guildId });
	}

	const modules = data.modules || {};
	const valorantRoles = data.valorantRoles || {};
	const loggingChannelID = data.loggingChannelID || '';

	const rule = interaction.options.getString('rule');

	// Checks if the rule is valid
	const valid = await validateRule(rule, interaction);
	if (!valid) return;

	const type = configs[rule];
	let option;
	let incorrectType = false;

	// Checks for valid value type
	// TODO: also check if the other values are set (or just ignore them)
	switch (type) {
		case 'boolean':
			if (!interaction.options.getBoolean('boolean')) {
				incorrectType = true;
			} else {
				option = interaction.options.getBoolean('boolean');
			}
			break;
		case 'channel':
			if (!interaction.options.getChannel('channel')) {
				incorrectType = true;
			} else {
				option = interaction.options.getChannel('channel');
			}
			break;
		case 'role':
			if (!interaction.options.getRole('role')) {
				incorrectType = true;
			} else {
				option = interaction.options.getRole('role');
			}
			break;
	}

	if (incorrectType) {
		const incorrectTypeEmbed = newEmbed()
			.setTitle('Invalid Type!')
			.setColor(colors.error)
			.setDescription(`The provided value for \`${rule}\` is in an incorrect format. Please provide a \`${type}\``);

		await interaction.editReply({
			embeds: [incorrectTypeEmbed],
		});
		return;
	}

	let newValue = '';

	// Set the value in the config
	// TODO: maybe make this better than hard coding all these
	if (rule.match(/valorant-role-/)) {
		// Valorant roles
		newValue = `<@&${option.id}>`;

		const rankName = rule.match(/valorant-role-(?<rank>(.*))/).groups.rank;
		valorantRoles[rankName] = option.id;
	} else if (rule.match(/enable-/)) {
		// Modules
		newValue = `\`${option}\``;

		const moduleName = rule.match(/enable-(?<name>(.*))/).groups.name;
		modules[moduleName] = option;
	} else {
		// Did not make custom save path for rule!!
		newValue = '`nil`';
		logger.child({ mode: 'CONFIG', metaData: { userID: interaction.user.id, guildID: interaction.guildId } }).warn(`A custom save path is not made for rule '${rule}'`);
	}

	// Save the config
	const newGuildConfig = await guildConfigSchema.findOneAndUpdate({ guildID: interaction.guildId }, {
		modules: modules,
		valorantRoles: valorantRoles,
		loggingChannelId: loggingChannelID,
	});
	database.writeToDatabase(newGuildConfig, 'UPDATED GUILD CONFIG');

	const confirmationEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(`\`${rule}\` was successfully set to ${newValue}`);

	await interaction.editReply({
		embeds: [confirmationEmbed],
	});
}

async function viewConfig(interaction) {
	// TODO: add a way to bulk-view configs (like doing /config view valorant-role for a list of all roles)
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	// Checks if the server has any data
	if (!data) {
		const noDataEmbed = newEmbed()
			.setTitle('No data!')
			.setColor(colors.configCommand)
			.setDescription('This server does not seem to have any configs set!');

		await interaction.editReply({
			embeds: [noDataEmbed],
		});
	}

	const modules = data.modules || {};
	const valorantRoles = data.valorantRoles || {};
	// const loggingChannelID = data.loggingChannelID || '';

	const rule = interaction.options.getString('rule');

	// Checks if the rule is valid
	const valid = await validateRule(rule, interaction);
	if (!valid) return;

	let value;

	// TODO:  maybe make this better than hard coding all these
	if (rule.match(/valorant-role-/)) {
		// Valorant roles

		const rankName = rule.match(/valorant-role-(?<rank>(.*))/).groups.rank;
		value = valorantRoles[rankName] ? `<@&${valorantRoles[rankName]}>` : '`Unassigned`';
	} else if (rule.match(/enable-/)) {
		// Modules

		const moduleName = rule.match(/enable-(?<name>(.*))/).groups.name;
		value = modules[moduleName] ? `\`${modules[moduleName]}\`` : '`false`';
	} else {
		// No custom save path for this rule!!
		value = '`nil`';
		logger.child({ mode: 'CONFIG', metaData: { userID: interaction.user.id, guildID: interaction.guildId } }).warn(`A custom save path is not made for rule '${rule}'`);
	}

	const valueEmbed = newEmbed()
		.setTitle('Config View')
		.setColor(colors.configCommand)
		.setDescription(`\`${rule}\` is currently set to ${value}`);

	await interaction.editReply({
		embeds: [valueEmbed],
	});
}

// Checks if a rule is valid in the configs
async function validateRule(rule, interaction) {
	if (!configs[rule]) {
		const invalidRuleEmbed = newEmbed()
			.setTitle('Invalid Rule!')
			.setColor(colors.error)
			.setDescription(`The provided rule \`${rule}\` is not a valid rule!`);

		await interaction.editReply({
			embeds: [invalidRuleEmbed],
		});

		return false;
	}

	return true;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Edit specific server features')

		.addSubcommand(subcommand => subcommand
			.setName('set')
			.setDescription('Set a value of a config')

			// <rule>
			.addStringOption(option => option
				.setName('rule')
				.setDescription('The rule to make modifications to')
				.setRequired(true),
				// .setAutocomplete(true),
			)

			// <values>
			.addStringOption(option => option
				.setName('string')
				.setDescription('The string value to set the config to'),
			)

			.addBooleanOption(option => option
				.setName('boolean')
				.setDescription('The boolean value to set the config to'),
			)

			.addRoleOption(option => option
				.setName('role')
				.setDescription('The role to set the config to'),
			)

			.addChannelOption(option => option
				.setName('channel')
				.setDescription('The channel to set the config to'),
			),
		)

		// view command
		.addSubcommand(subcommand => subcommand
			.setName('view')
			.setDescription('View the value of a config')
			.addStringOption(option => option
				.setName('rule')
				.setDescription('The rule to view the value of')
				.setRequired(true),
			),
		),
	category: 'admin',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'set':
				setConfig(interaction);
				break;
			case 'view':
				viewConfig(interaction);
				break;
		}
	},
};
