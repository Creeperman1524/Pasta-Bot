const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays a help message'),

	async execute(interaction) {
		const fields = [];
		const { commands } = interaction.client;

		// Stores the command name and descriptions into separate arrays
		const names = commands.map(command => command.data.name);
		const descriptions = commands.map(commandDesc => commandDesc.data.description);

		for (let i = 0; i < names.length; i++) {
			fields.push({
				name: `/${names[i]}`,
				value: `\`${descriptions[i]}\``,
				// inline: true,
			});
		}

		// Creates the embed for the help page
		const helpEmbed = newEmbed()
			.setTitle('Commands')
			.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
			.setColor(colors.helpCommand)
			.setDescription('A list of all the current commands')
			.addFields(fields);

		return interaction.reply({
			embeds: [helpEmbed],
		});
	},
};