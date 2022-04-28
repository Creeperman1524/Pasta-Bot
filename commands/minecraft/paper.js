const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');
const { newEmbed, colors } = require('../../util/embeds.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('paper')
		.setDescription('A command to display the most recent update to the paper server'),
	category: 'minecraft',

	async execute(interaction) {

		await interaction.deferReply();

		const url = 'https://papermc.io/api/v2/projects/paper/versions/1.18.2/';

		// Gets the data
		const response = await fetch(url);
		const data = await response.json();

		const fields = [];
		const updateEmbed = newEmbed();

		// Retrieves the 3 latest updates
		for (let i = 0; i < 3; i++) { // TODO: ERRORS WHEN THERE AREN'T 3 TOTAL BUILDS
			// Gets data on each build
			const responseField = await fetch(url + '/builds/' + data.builds[(data.builds.length - 1) - i]);
			const newField = await responseField.json();

			// Pushes new
			fields.push({
				name: truncateText(`(${newField.build}) - ${newField.changes[0].summary}`, 256),
				value: truncateText(newField.changes[0].message, 1024),
			});

			if (i === 0) {
				updateEmbed.setTimestamp(newField.time);
			}
		}

		updateEmbed.setTitle('Recent 1.18.2 Paper Updates')
			.setURL('https://papermc.io/downloads')
			.setColor(colors.paperCommand)
			.addFields(fields)
			.setDescription('Latest 3 fixes for the paper server');

		await interaction.editReply({
			embeds: [updateEmbed],
		});
	},
};

function truncateText(text, length) {
	if (text.length <= length - 3) {
		return text;
	}

	return text.substr(0, length - 3) + '\u2026';
}