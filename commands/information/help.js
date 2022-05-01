const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { paginate } = require('../../util/pagination.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays a help message')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to get more information on')
				.setRequired(false),
		),
	category: 'information',

	async execute(interaction) {
		await interaction.deferReply();

		const command = interaction.options.getString('command');
		if(!command) {
			generalHelp(interaction);
		} else {
			detailedHelp(interaction, command);
		}

	},
};

async function generalHelp(interaction) {
	const { commands } = interaction.client;

	// Gathers all of the categories from the commands
	const rawCategories = commands.map(command => command.category);
	const categories = rawCategories.filter((item, pos) => {return rawCategories.indexOf(item) == pos;}); // deduplicates the array

	const embeds = [];

	// Loops through all categories to find which command corresponds to which
	for(const category of categories) {
		const fields = [];
		const filteredCommands = commands.filter(command => command.category == category);
		filteredCommands.forEach(command => {
			fields.push({
				name: `/${command.data.name}`,
				value: `\`${command.data.description}\``,
			});
		});

		// Creates an embed for each category
		embeds.push(
			newEmbed()
				.setTitle(`Category - __${category}__`)
				.setColor(colors.helpCommand)
				.addFields(fields),
		);
	}

	// Sends the paginated embed
	paginate(interaction, embeds, 60000);

}

async function detailedHelp(interaction, commandName) {
	const { commands } = interaction.client;

	// If the command doesn't exist
	if(!commands.get(commandName)) {
		const notFoundEmbed = newEmbed()
			.setTitle('Command Not Found!')
			.setColor(colors.warn)
			.setDescription(`The command \`/${commandName}\` is not a valid command!`);

		await interaction.editReply({ embeds:[notFoundEmbed] });

		return;
	}

	// Loops through all subcommands
	const command = commands.get(commandName);
	const subCommands = command.data.options;
	const fields = [];

	for(const subCommand of subCommands) {
		// Checks if it's a subcommand (and not an option)
		if(!subCommand.toJSON().options) continue;

		fields.push({
			name: `/${command.data.name} ${subCommand.name}`,
			value: `\`${subCommand.description}\``,
		});
	}

	// Creates and sends the embed
	const detailedCommanEmbed = newEmbed()
		.setTitle(`Detailed Help - __/${command.data.name}__`)
		.setColor(colors.helpCommand)
		.setDescription(`\`${command.data.description}\`\n
						**Category:** \`${command.category}\`\n
						**Default Permission:** \`${command.data.defaultPermission || true}\``) // TODO: permissions v2
		.addFields(fields);

	await interaction.editReply({ embeds: [detailedCommanEmbed] });

}