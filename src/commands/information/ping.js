const { SlashCommandBuilder } = require('discord.js');
const { newEmbed, colors } = require('../../util/embeds.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Checks the ping of the bot'),
	category: 'information',

	async execute(interaction) {
		const pingEmbed = newEmbed()
			.setTitle('Ping')
			.setColor(colors.pingCommand)
			.addFields({
				name: 'Roundtrip Latency',
				value: `${Date.now() - interaction.createdTimestamp } ms`,
			}, {
				name: 'Websocket Heartbeat',
				value: `${Math.round(interaction.client.ws.ping) } ms`,
			});

		await interaction.editReply({
			embeds: [pingEmbed],
		});
	},
};
