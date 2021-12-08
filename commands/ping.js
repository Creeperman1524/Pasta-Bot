const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { version } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Checks the ping of the bot'),

	async execute(interaction) {

		// "so and so is thinking"
		await interaction.deferReply();

		const pingEmbed = new MessageEmbed()
			.setTitle('Ping')
			.setColor(0xff00ff)
			.addFields({
				name: 'Roundtrip Latency',
				value: Date.now() - interaction.createdTimestamp + ' ms',
			}, {
				name: 'Websocket Heartbeat',
				value: Math.round(interaction.client.ws.ping) + ' ms',
			})
			.setFooter(`Version ${version}`);

		await interaction.editReply({
			embeds: [pingEmbed],
		});
	},
};