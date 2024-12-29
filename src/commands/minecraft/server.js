const mcping = require('mcping-js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { mcServerPort, mcServerVersion } = require('../../config.json');
const { newEmbed, colors } = require('../../util/embeds.js');

const fetch = require('node-fetch');
const { logger } = require('../../logging');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Useful commands for information on the minecraft server')

		// status
		.addSubcommand(subcommand => subcommand
			.setName('status')
			.setDescription('Shows the status of the Minecraft server')
			.addStringOption(option => option
				.setName('ip')
				.setDescription('The IP address of the server you wish to view'),
			),
		)

		// ip
		.addSubcommand(subcommand => subcommand
			.setName('ip')
			.setDescription('The ip address of the Minecraft server'),
		)

		// seed
		.addSubcommand(subcommand => subcommand
			.setName('seed')
			.setDescription('The seed of the Minecraft server'),
		)

		// map
		.addSubcommand(subcommand => subcommand
			.setName('map')
			.setDescription('The map of the Minecraft server'),
		)

		// wakeup
		.addSubcommand(subcommand => subcommand
			.setName('wakeup')
			.setDescription('Wakes up the server from its sleeping mode'),
		),
	category: 'minecraft',

	// Commands
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
		case 'status':
			statusCommand(interaction);
			break;
		case 'ip':
			ipCommand(interaction);
			break;
		case 'seed':
			seedCommand(interaction);
			break;
		case 'map':
			mapCommand(interaction);
			break;
		case 'wakeup':
			interaction.editReply('This feature has been discontinued (for now). Sorry!');
			// await wakeupCommand(interaction);
			// break;
		}
	},
};

// Status command
function statusCommand(interaction) {
	const ip = interaction.options.getString('ip');

	// Checks if the user input a server
	if (ip == null) {
		const server = new mcping.MinecraftServer(process.env.mcServerIP, mcServerPort);

		// Pings the server
		pingServer(server, interaction, process.env.mcServerIP);

		return;
	} else {
		const server = new mcping.MinecraftServer(ip, mcServerPort);

		// Pings the server
		pingServer(server, interaction, ip);
		return;
	}
}

// Server ping handling
let favicon, hasIcon, serverStatus;

function pingServer(server, interaction, ip) {
	server.ping(1000, 765, (err, res) => {

		// Determines if it's online or not
		if (err) {

			// Offline
			const offlineEmbed = newEmbed()
				.setTitle('Status for ' + ip + ':')
				.setColor(colors.serverPingCommand)
				.setDescription('*Server is offline*');
			interaction.editReply({
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
			// } else if(res.players.sample.length == 0) {
			// 	// Server is sleeping
			// 	serverStatus = '**Server is currently sleeping!**\nLogging into the server will automatically start it up (after a few minutes)';
			} else {
				// People are online
				for (let i = 0; i < res.players.sample.length; i++) {
					onlinePlayers.push(res.players.sample[i].name);
				}
				onlinePlayers = onlinePlayers.sort().join(', ');

				serverStatus = '**' + res.players.online + '/' + res.players.max + '**' + ' player(s) online.\n\n' + onlinePlayers;

			}
			if (hasIcon === 'yes') {
				// Sends an embed with an icon image
				const buffer = Buffer.from(favicon, 'base64');
				const serverEmbedicon = newEmbed()
					.setTitle('Status for ' + ip + ':')
					.setColor(colors.serverPingCommand)
					.setDescription(serverStatus)
					.setThumbnail('attachment://icon.png')
					.addField('Server version:', res.version.name);
				interaction.editReply({
					embeds: [serverEmbedicon],
					files: [{
						attachment: buffer,
						name: 'icon.png',
					}],
				});
			} else if (hasIcon === 'no') {
				// Sends an embed without the icon
				const serverEmbedNoIcon = newEmbed()
					.setTitle('Status for ' + ip + ':')
					.setColor(colors.serverPingCommand)
					.setDescription(serverStatus)
					.addField('Server version:', res.version.name);
				interaction.editReply({
					embeds: [serverEmbedNoIcon],
				});
			}
		}
	}, 3000);
}

// Ip command
function ipCommand(interaction) {
	const ipEmbed = newEmbed()
		.setTitle('Connection Info')
		.setColor(colors.serverIPCommand)
		.addFields(
			{
				name: 'IP',
				value: `\`${process.env.mcServerIP}\``,
				inline: true,
			},
			{
				name: 'Port',
				value: `\`${mcServerPort}\``,
				inline: true,
			},
			{
				name: 'Platform',
				value: '`Minecraft Java Edition`',
				inline: true,
			},
			{
				name: 'Version',
				value: `\`${mcServerVersion}\` - Fabric`,
				inline: true,
			},
		);

	interaction.editReply({ embeds: [ipEmbed] });
}

// Seed command
function seedCommand(interaction) {
	const seedEmbed = newEmbed()
		.setTitle('Server Seed')
		.setColor(colors.serverSeedCommand)
		.setDescription(`Seed: \`${process.env.mcServerSeed}\``);

	interaction.editReply({ embeds: [seedEmbed] });
}

// Map command
function mapCommand(interaction) {
	const mapEmbed = newEmbed()
		.setTitle('Server Map')
		.setColor(colors.serverMapCommand)
		.setDescription(`Server map: [${process.env.mcServerIP}:8123/](http://${process.env.mcServerIP}:8123/)\nYou can bookmark it for ease of access!`);

	interaction.editReply({ embeds: [mapEmbed] });
}

// Wakeup command
async function wakeupCommand(interaction) {
	const statusURL = `http://${process.env.mcServerIP}:8123/status`;
	const wakeupURL = `http://${process.env.mcServerIP}:8123/wakeup`;

	const responseEmbed = newEmbed()
		.setTitle('Server Sleeping Status')
		.setColor(colors.serverWakeupCommand)
		.setDescription('`Contacting server...`');

	interaction.editReply({ embeds: [responseEmbed] });

	try {
		const rawStatus = await fetch(statusURL);
		const status = await rawStatus.json();

		if(status.status == 'Sleeping') {
			// Notify the user that the server is waking up
			responseEmbed.setDescription(`Server is currently **sleeping** 😴. \`Waking it up...\`\n\nThe server sleeps to save power and computer resources. Logging on or running this command will have the server avaliable <t:${Math.floor((Date.now() + (3 * 60 * 1000)) / 1000)}:R>`);

			// Wakes the server up
			await fetch(wakeupURL, {
				method: 'POST',
				body: null,
			});

		} else if(status.status == 'Running') {
			// Notify the user that the server is running
			responseEmbed.setDescription('Server is currently **running** 🏃. Go play on it :D');
		}
	} catch (error) {
		// Handle any API errors (mostly due from the server being offline)
		if(error != undefined) {
			logger.child({
				mode: 'SERVER',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild.name,
					guildid: interaction.guild.id,
				},
			}).error(error);
		}

		// Notify the user the server is offline
		responseEmbed.setDescription('Server is currently **offline** ❌ (or something terrible has gone wrong!).\nPlease contact the server owner for any details.');
	}

	interaction.editReply({ embeds: [responseEmbed] });
}