import { SlashCommandBuilder } from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { Command } from '../../util/types/command';

module.exports = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Checks the ping of the bot'),
	category: 'information',

	async execute(interaction) {
		const pingEmbed = newEmbed()
			.setTitle('Ping')
			.setColor(colors.pingCommand)
			.addFields(
				{
					name: 'Roundtrip Latency',
					value: `${Date.now() - interaction.createdTimestamp} ms`
				},
				{
					name: 'Websocket Heartbeat',
					value: `${Math.round(interaction.client.ws.ping)} ms`
				}
			);

		await interaction.editReply({
			embeds: [pingEmbed]
		});
	}
} as Command;
