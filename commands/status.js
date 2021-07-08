const mcping = require('mcping-js');
const Discord = require('discord.js');
const {
	mcServerPort,
	version,
} = require('../config.json');
const {
	mcServerIP,
} = require('../hidden.json');

module.exports = {
	name: 'status',
	description: 'Shows the status of the Minecraft server',
	aliases: [''],
	args: false,
	usage: '[server IP]',
	guildOnly: false,
	cooldown: 3,
	execute(message, args) {
		// Checks if the user input a server
		if (args == '') {
			const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

			// Pings the server
			pingServer(server, message, mcServerIP);

			return;
		} else {
			// The default server connection

			const server = new mcping.MinecraftServer(args[0], mcServerPort);

			// Pings the server
			pingServer(server, message, args[0]);

			return;
		}


	},
};


// Server ping handeling
let favicon, hasIcon, serverStatus;

function pingServer(server, message, ip) {
	server.ping(1000, 756, (err, res) => {
		// Determines if it's online or not
		if (err) {

			// Offline
			const offlineEmbed = new Discord.MessageEmbed()
				.setTitle('Status for ' + ip + ':')
				.setColor(0x854f2b)
				.setDescription('*Server is offline*')
				.setFooter(`Version ${version}`);
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
					.setTitle('Status for ' + ip + ':')
					.setColor(0x854f2b)
					.setDescription(serverStatus)
					.setThumbnail('attachment://icon.png')
					.addField('Server version:', res.version.name)
					.setFooter(`Version ${version}`);
				message.channel.send(serverEmbedicon);
			} else if (hasIcon === 'no') {
				// Sends an embed without the icon
				const serverEmbedNoIcon = new Discord.MessageEmbed()
					.setTitle('Status for ' + ip + ':')
					.setColor(0x854f2b)
					.setDescription(serverStatus)
					.addField('Server version:', res.version.name)
					.setFooter(`Version ${version}`);
				message.channel.send(serverEmbedNoIcon);
			}
		}
	}, 3000);
}