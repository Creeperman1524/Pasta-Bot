const mcping = require('mcping-js');
const Discord = require('discord.js');
const {
	mcServerPort,
} = require('../config.json');
const {
	mcServerIP,
} = require('../hidden.json');

let favicon, hasIcon, serverStatus;

module.exports = {
	name: 'status',
	description: 'Shows the status of the Minecraft server',
	aliases: ['server'],
	args: false,
	guildOnly: false,
	cooldown: 3,
	execute(message) {

		// The server connection
		const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

		// Pings the server
		server.ping(1000, 754, (err, res) => {

			// Determines if it's online or not
			if (err) {

				// Offline
				const offlineEmbed = new Discord.MessageEmbed()
					.setTitle('Status for ' + mcServerIP + ':')
					.setColor(0x854f2b)
					.setDescription('*Server is offline*');
				message.channel.send(offlineEmbed);
				return;
			} else {
				// Retrieves the server icon
				try {
					favicon = res.favicon.slice(22);
					hasIcon = 'yes';
				} catch (error) {
					hasIcon = 'no';
				}

				// Retrieves the current players
				let onlinePlayers = [];
				if (typeof res.players.sample == 'undefined') {
					// No one is online
					serverStatus = '*No one is playing!*';
				} else {
					// People are online
					for (let i = 0; i < res.players.sample.length; i++) {
						onlinePlayers.push(res.players.sample[i].name);
					}
					onlinePlayers = onlinePlayers.sort().join(', ');
					// onlinePlayers = escape(onlinePlayers.sort().join(', ')).replace(/\u00A7[0-9A-FK-OR]|\\n/ig, '');
					serverStatus = '**' + res.players.online + '/' + res.players.max +
                        '**' + ' player(s) online.\n\n' + onlinePlayers;

				}
				if (hasIcon === 'yes') {
					// Sends an embed with an icon image
					const buffer = Buffer.from(favicon, 'base64');
					const serverEmbedicon = new Discord.MessageEmbed()
						.attachFiles({
							attachment: buffer,
							name: 'icon.png',
						})
						.setTitle('Status for ' + mcServerIP + ':')
						.setColor(0x854f2b)
						.setDescription(serverStatus)
						.setThumbnail('attachment://icon.png')
						.addField('Server version:', res.version.name);
					message.channel.send(serverEmbedicon);
				} else if (hasIcon === 'no') {
					// Sends an embed without the icon
					const serverEmbedNoIcon = new Discord.MessageEmbed()
						.setTitle('Status for ' + mcServerIP + ':')
						.setColor(0x854f2b)
						.setDescription(serverStatus)
						.addField('Server version:', res.version.name);
					message.channel.send(serverEmbedNoIcon);
				}
			}
		}, 3000);
		return;
	},
};