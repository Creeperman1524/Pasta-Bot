const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { version } = require('../../config.json');

const buildDate = new Date();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Displays some info about the bot\'s current stats'),

	async execute(interaction) {
		const infoEmbed = new MessageEmbed()
			.setTitle('Information')
			.setURL('https://github.com/Creeperman1524/Pasta-Bot')
			.setColor(0x0088ff)
			.addFields({
				name: 'Version',
				value: `\`${version}\``,
			}, {
				name: 'Creator',
				value: '`Creeperman1524`',
			}, {
				name: 'Total Servers',
				value: `\`${interaction.client.guilds.cache.size}\``,
			})
			.setDescription('All the information you need for this bot')
			.setTimestamp(buildDate)
			.setFooter({ text: `Version ${version}` });

		interaction.reply({
			embeds: [infoEmbed],
		});
	},
};