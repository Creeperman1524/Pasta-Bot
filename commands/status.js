const mcping = require('mcping-js');
const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');
const {
	mcServerPort,
	version,
} = require('../config.json');
const {
	mcServerIP,
} = require('../hidden.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Shows the status of the Minecraft server')
		.addStringOption(option =>
			option.setName('ip')
				.setDescription('The IP address of the server'),
		),
	async execute(interaction) {
		const ip = interaction.options.getString('ip');

		// Checks if the user input a server
		if (ip == null) {
			const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

			// Pings the server
			pingServer(server, interaction, mcServerIP);

			return;
		} else {
			// The default server connection

			const server = new mcping.MinecraftServer(ip, mcServerPort);

			// Pings the server
			pingServer(server, interaction, ip);

			return;
		}


	},
};


// Server ping handeling
let favicon, hasIcon, serverStatus;

function pingServer(server, interaction, ip) {
	console.log(server);
	server.ping(1000, 756, (err, res) => {
		// Determines if it's online or not
		if (err) {

			// Offline
			const offlineEmbed = new MessageEmbed()
				.setTitle('Status for ' + ip + ':')
				.setColor(0x854f2b)
				.setDescription('*Server is offline*')
				.setFooter(`Version ${version}`);
			interaction.reply({
				embeds: [offlineEmbed],
			});
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
				const serverEmbedicon = new MessageEmbed()
					.setTitle('Status for ' + ip + ':')
					.setColor(0x854f2b)
					.setDescription(serverStatus)
					.setThumbnail('attachment://icon.png')
					.addField('Server version:', res.version.name)
					.setFooter(`Version ${version}`);
				interaction.reply({
					embeds: [serverEmbedicon],
					files: [{
						attachment: buffer,
						name: 'icon.png',
					}],
				});
			} else if (hasIcon === 'no') {
				// Sends an embed without the icon
				const serverEmbedNoIcon = new MessageEmbed()
					.setTitle('Status for ' + ip + ':')
					.setColor(0x854f2b)
					.setDescription(serverStatus)
					.addField('Server version:', res.version.name)
					.setFooter(`Version ${version}`);
				interaction.reply({
					embeds: [serverEmbedNoIcon],
				});
			}
		}
	}, 3000);
}