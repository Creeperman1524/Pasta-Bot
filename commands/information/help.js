const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton } = require('discord.js');
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
		commands.forEach(command => {
			if(command.category == category) {
				fields.push({
					name: `/${command.data.name}`,
					value: `\`${command.data.description}\``,
				});
			}
		});

		// Creates an embed for each category
		embeds.push(
			newEmbed()
				.setTitle(`Help - __${category}__`)
				.setColor(colors.helpCommand)
				.addFields(fields),
		);
	}

	paginate(interaction, embeds, 60000);

}

function detailedHelp(interaction, command) {
	console.log(command);
}