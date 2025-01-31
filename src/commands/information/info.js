const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { newEmbed, colors } = require('../../util/embeds.js');

const buildDate = new Date();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Displays some info about the bot\'s current stats'),
	category: 'information',

	async execute(interaction) {
		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Github')
					.setURL('https://github.com/Creeperman1524/Pasta-Bot')
					.setStyle(ButtonStyle.Link),
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
				inline: true,
			}, {
				// TODO: update into relative timestamp
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
