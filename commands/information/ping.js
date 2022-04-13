const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Checks the ping of the bot'),

	async execute(interaction) {

		// "so and so is thinking"
		await interaction.deferReply();

		const pingEmbed = newEmbed()
			.setTitle('Ping')
			.setColor(colors.pingCommand)
			.addFields({
				name: 'Roundtrip Latency',
				value: Date.now() - interaction.createdTimestamp + ' ms',
			}, {
				name: 'Websocket Heartbeat',
				value: Math.round(interaction.client.ws.ping) + ' ms',
			});

		await interaction.editReply({
			embeds: [pingEmbed],
		});
	},
};