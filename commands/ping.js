const Discord = require('discord.js');
const {
	version,
} = require('../config.json');

module.exports = {
	name: 'ping',
	description: 'Checks the ping of the server and the bot',
	cooldown: 5,
	execute(message, args, bot) {
		message.channel.send('Pinging... :ping_pong: ').then(m => {

			const pingEmbed = new Discord.MessageEmbed()
				.setTitle('Ping')
				.setColor(0xff00ff)
				.addFields({
					name: 'Roundtrip Latency',
					value: m.createdTimestamp - message.createdTimestamp + ' ms',
				}, {
					name: 'Websocket Heartbeat',
					value: Math.round(bot.ws.ping) + ' ms',
				})
				.setFooter(`Version ${version}`);

			m.edit(pingEmbed);
		});
	},
};