import { APIEmbedField, ApplicationCommandOptionType, SlashCommandBuilder } from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { paginate } from '../../util/pagination';
import { Command, ModChatInputCommandInteraction } from '../../util/types/command';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays a help message')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command to get more information on')
				.setRequired(false)
				.setAutocomplete(true)
		),
	category: 'information',

	async execute(interaction) {
		const command = interaction.options.getString('command');
		if (!command) {
			generalHelp(interaction);
		} else {
			detailedHelp(interaction, command.toLowerCase());
		}
	},

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		// Maps the command names to an array
		const choices = interaction.client.commands.map((command) => command.data.name);
		const filtered = choices.filter((choice) => choice.startsWith(focusedValue));

		// Responds with the command names that match what's currently typed
		await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
	}
} as Command;

async function generalHelp(interaction: ModChatInputCommandInteraction) {
	const { commands } = interaction.client;

	// Gathers all of the categories from the commands
	const rawCategories = commands.map((command) => command.category);
	const categories = rawCategories.filter((item, pos) => {
		return rawCategories.indexOf(item) == pos;
	}); // deduplicates the array

	const embeds = [];

	// Loops through all categories to find which command corresponds to which
	for (const category of categories) {
		const fields: APIEmbedField[] = [];
		const filteredCommands = commands.filter((command) => command.category == category);
		filteredCommands.forEach((command) => {
			fields.push({
				name: `/${command.data.name}`,
				value: `\`${command.data.description}\``
			});
		});

		// Creates an embed for each category
		embeds.push(
			newEmbed()
				.setTitle(`Category - __${category}__`)
				.setColor(colors.helpCommand)
				.addFields(fields)
		);
	}

	// Sends the paginated embed
	paginate(interaction, embeds, 60000);
}

async function detailedHelp(interaction: ModChatInputCommandInteraction, commandName: string) {
	const { commands } = interaction.client;
	const command = commands.get(commandName);

	// If the command doesn't exist
	if (!command) {
		const notFoundEmbed = newEmbed()
			.setTitle('Command Not Found!')
			.setColor(colors.warn)
			.setDescription(`The command \`/${commandName}\` is not a valid command!`);

		await interaction.editReply({ embeds: [notFoundEmbed] });

		return;
	}

	// Loops through all subcommands
	const subCommands = command.data.toJSON().options ?? [];
	const fields: APIEmbedField[] = [];

	for (const subCommand of subCommands) {
		// Checks if it's a subcommand (and not an option)
		if (subCommand.type !== ApplicationCommandOptionType.Subcommand) continue;

		fields.push({
			name: `/${command.data.name} ${subCommand.name}`,
			value: `\`${subCommand.description}\``
		});
	}

	// Creates and sends the embed
	const detailedCommanEmbed = newEmbed()
		.setTitle(`Detailed Help - __/${command.data.name}__`)
		.setColor(colors.helpCommand)
		.setDescription(
			`\`${command.data.description}\`\n
						**Category:** \`${command.category}\`\n
						**Default Permission:** \`${command.data.default_permission || true}\``
		) // TODO: permissions v2
		.addFields(fields);

	await interaction.editReply({ embeds: [detailedCommanEmbed] });
}
