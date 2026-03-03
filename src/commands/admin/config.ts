import { Role, SlashCommandBuilder, TextChannel } from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { configs as rawConfigs } from '../../config.json';
import { logger } from '../../logging';

import database from '../../util/database';
import guildConfigSchema from '../../schemas/guildConfigs.schema';
import { Command, ModChatInputCommandInteraction } from '../../util/types/command';

type ParsedOption =
	| { type: 'boolean'; value: boolean }
	| { type: 'channel'; value: TextChannel }
	| { type: 'role'; value: Role };

const configs = rawConfigs as Record<string, string>;

async function setConfig(interaction: ModChatInputCommandInteraction) {
	// Check for the guild data, creating a new entry if needed
	const data = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ $setOnInsert: { guildID: interaction.guildId } },
		{ upsert: true, new: true }
	);

	const modules = data.modules || {};
	const valorantRoles = data.valorantRoles || {};
	const loggingChannelID = data.loggingChannelID || '';

	const rule = interaction.options.getString('rule');

	if (!rule) {
		const missingRuleEmbed = newEmbed()
			.setTitle('No data!')
			.setColor(colors.configCommand)
			.setDescription('You must provide a rule to update!');

		await interaction.editReply({
			embeds: [missingRuleEmbed]
		});
		return;
	}

	// Checks if the rule is valid
	const valid = await validateRule(rule, interaction);
	if (!valid) return;

	const type = configs[rule];

	// Checks for valid value type
	// TODO: also check if the other values are set (or just ignore them)
	const parsed = parseOption(interaction, type);

	if (parsed == null) {
		const incorrectTypeEmbed = newEmbed()
			.setTitle('Invalid Type!')
			.setColor(colors.error)
			.setDescription(
				`The provided value for \`${rule}\` is in an incorrect format. Please provide a \`${type}\``
			);

		await interaction.editReply({
			embeds: [incorrectTypeEmbed]
		});
		return;
	}

	let newValue = '';

	// Set the value in the config
	// TODO: maybe make this better than hard coding all these
	if (rule.match(/valorant-role-/) && parsed.type == 'role') {
		// Valorant roles
		newValue = `<@&${parsed.value.id}>`;

		const rankName = rule.match(/valorant-role-(?<rank>(.*))/)?.groups?.rank as string;
		valorantRoles[rankName] = parsed.value.id;
	} else if (rule.match(/enable-/) && parsed.type == 'boolean') {
		// Modules
		newValue = `\`${parsed.value}\``;

		const moduleName = rule.match(/enable-(?<name>(.*))/)?.groups?.name as string;
		modules[moduleName] = parsed.value;
	} else {
		// Did not make custom save path for rule!!
		newValue = '`nil`';
		logger
			.child({
				mode: 'CONFIG',
				metaData: { userID: interaction.user.id, guildID: interaction.guildId }
			})
			.warn(`A custom save path is not made for rule '${rule}'`);
	}

	// Save the config
	const newGuildConfig = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{
			modules: modules,
			valorantRoles: valorantRoles,
			loggingChannelId: loggingChannelID
		}
	);

	if (!newGuildConfig) {
		interaction.editReply({
			content: 'Could not update the database! Something has gone wrong'
		});
		logger
			.child({
				mode: 'CONFIG',
				metaData: { userID: interaction.user.id, guildID: interaction.guildId }
			})
			.error(
				`Could not update database for guild '${interaction.guild?.name}' with modules '${modules}', valorantRoles: '${valorantRoles}' and loggingCHannelID: '${loggingChannelID}'`
			);
		return;
	}

	database.writeToDatabase(newGuildConfig, 'UPDATED GUILD CONFIG');

	const confirmationEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(`\`${rule}\` was successfully set to ${newValue}`);

	await interaction.editReply({
		embeds: [confirmationEmbed]
	});
}

async function viewConfig(interaction: ModChatInputCommandInteraction) {
	// TODO: add a way to bulk-view configs (like doing /config view valorant-role for a list of all roles)
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	// Checks if the server has any data
	if (!data) {
		const noDataEmbed = newEmbed()
			.setTitle('No data!')
			.setColor(colors.configCommand)
			.setDescription('This server does not seem to have any configs set!');

		await interaction.editReply({
			embeds: [noDataEmbed]
		});
		return;
	}

	const modules = data.modules || {};
	const valorantRoles = data.valorantRoles || {};
	// const loggingChannelID = data.loggingChannelID || '';

	const rule = interaction.options.getString('rule');

	if (!rule) {
		const missingRuleEmbed = newEmbed()
			.setTitle('No data!')
			.setColor(colors.configCommand)
			.setDescription('You must provide a rule to update!');

		await interaction.editReply({
			embeds: [missingRuleEmbed]
		});
		return;
	}

	// Checks if the rule is valid
	const valid = await validateRule(rule, interaction);
	if (!valid) return;

	let value;

	// TODO:  maybe make this better than hard coding all these
	if (rule.match(/valorant-role-/)) {
		// Valorant roles

		const rankName = rule.match(/valorant-role-(?<rank>(.*))/)?.groups?.rank as string;
		value = valorantRoles[rankName] ? `<@&${valorantRoles[rankName]}>` : '`Unassigned`';
	} else if (rule.match(/enable-/)) {
		// Modules

		const moduleName = rule.match(/enable-(?<name>(.*))/)?.groups?.name as string;
		value = modules[moduleName] ? `\`${modules[moduleName]}\`` : '`false`';
	} else {
		// No custom save path for this rule!!
		value = '`nil`';
		logger
			.child({
				mode: 'CONFIG',
				metaData: { userID: interaction.user.id, guildID: interaction.guildId }
			})
			.warn(`A custom save path is not made for rule '${rule}'`);
	}

	const valueEmbed = newEmbed()
		.setTitle('Config View')
		.setColor(colors.configCommand)
		.setDescription(`\`${rule}\` is currently set to ${value}`);

	await interaction.editReply({
		embeds: [valueEmbed]
	});
}

// Checks if a rule is valid in the configs
async function validateRule(rule: string, interaction: ModChatInputCommandInteraction) {
	if (configs[rule]) return true;

	const invalidRuleEmbed = newEmbed()
		.setTitle('Invalid Rule!')
		.setColor(colors.error)
		.setDescription(`The provided rule \`${rule}\` is not a valid rule!`);

	await interaction.editReply({
		embeds: [invalidRuleEmbed]
	});

	return false;
}

// Parse an option from the user
function parseOption(
	interaction: ModChatInputCommandInteraction,
	type: string
): ParsedOption | null {
	switch (type) {
		case 'boolean': {
			const value = interaction.options.getBoolean('boolean');
			return value === null ? null : { type: 'boolean', value };
		}
		case 'channel': {
			const value = interaction.options.getChannel('channel');
			return value === null ? null : { type: 'channel', value: value as TextChannel };
		}
		case 'role': {
			const value = interaction.options.getRole('role');
			return value === null ? null : { type: 'role', value: value as Role };
		}
		default:
			return null;
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Edit specific server features')

		.addSubcommand((subcommand) =>
			subcommand
				.setName('set')
				.setDescription('Set a value of a config')

				// <rule>
				.addStringOption(
					(option) =>
						option
							.setName('rule')
							.setDescription('The rule to make modifications to')
							.setRequired(true)
					// .setAutocomplete(true),
				)

				// <values>
				.addStringOption((option) =>
					option.setName('string').setDescription('The string value to set the config to')
				)

				.addBooleanOption((option) =>
					option
						.setName('boolean')
						.setDescription('The boolean value to set the config to')
				)

				.addRoleOption((option) =>
					option.setName('role').setDescription('The role to set the config to')
				)

				.addChannelOption((option) =>
					option.setName('channel').setDescription('The channel to set the config to')
				)
		)

		// view command
		.addSubcommand((subcommand) =>
			subcommand
				.setName('view')
				.setDescription('View the value of a config')
				.addStringOption((option) =>
					option
						.setName('rule')
						.setDescription('The rule to view the value of')
						.setRequired(true)
				)
		),
	category: 'admin',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'set':
				await setConfig(interaction);
				break;
			case 'view':
				await viewConfig(interaction);
				break;
		}
	}
} as Command;
