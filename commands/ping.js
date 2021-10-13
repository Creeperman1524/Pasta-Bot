const Discord = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');

const {
	version,
} = require('../config.json');

const name = 'ping';
const description = 'Checks the ping of the bot';

module.exports = {
	name: name,
	description: description,

	data: new SlashCommandBuilder()
		.setName(name)
		.setDescription(description),

	async execute(message) {
		message.channel.send('Pinging... :ping_pong: ').then(m => {

			const pingEmbed = new Discord.MessageEmbed()
				.setTitle('Ping')
				.setColor(0xff00ff)
				.addFields({
					name: 'Roundtrip Latency',
					value: m.createdTimestamp - message.createdTimestamp + ' ms',
				}, {
					name: 'Websocket Heartbeat',
					value: Math.round(message.client.ws.ping) + ' ms',
				})
				.setFooter(`Version ${version}`);

			m.edit(pingEmbed);
		});
	},
};