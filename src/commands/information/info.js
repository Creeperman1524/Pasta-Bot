const { MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');

const buildDate = new Date();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Displays some info about the bot\'s current stats'),
	category: 'information',

	async execute(interaction) {
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setLabel('Github')
					.setURL('https://github.com/Creeperman1524/Pasta-Bot')
					.setStyle('LINK'),
			);

		// Uptime values
		const currentDate = new Date();
		const elapsed = (currentDate - buildDate) / 1000;
		const seconds = Math.floor(elapsed % 60);
		const minutes = Math.floor(elapsed / 60 % 60);
		const hours = Math.floor(elapsed / 60 / 60);

		const infoEmbed = newEmbed()
			.setTitle('Information')
			.setColor(colors.infoCommand)
			.setDescription('General information for the bot')
			.addFields({
				name: 'Creator',
				value: '`Creeperman1524#3279`',
				inline: true,
			}, {
				name: 'Total Servers',
				value: `\`${interaction.client.guilds.cache.size}\``,
				inline: true.valueOf,
			}, {
				name: 'Uptime',
				value: `\`${hours}h ${minutes}m ${seconds}s\``,
				inline: true,
			})
			.setTimestamp(buildDate);

		interaction.editReply({
			embeds: [infoEmbed],
			components: [row],
		});
	},
};
