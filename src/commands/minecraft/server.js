const mcping = require('mcping-js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { mcServerPort, mcServerVersion } = require('../../config.json');
const { newEmbed, colors } = require('../../util/embeds.js');

const fs = require('fs');
const fetch = require('node-fetch');
const { logger } = require('../../logging');

// Date when the minecraft server restarts/backs up
const buildDate = new Date();

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

		// backups
		.addSubcommand(subcommand => subcommand
			.setName('backups')
			.setDescription('View the backup information of the server'),
		)

		// ip
		.addSubcommand(subcommand => subcommand
			.setName('ip')
			.setDescription('The ip address of the Minecraft server'),
		)

		// map
		.addSubcommand(subcommand => subcommand
			.setName('map')
			.setDescription('The web-hosted map of the Minecraft server'),
		)

		// seed
		.addSubcommand(subcommand => subcommand
			.setName('seed')
			.setDescription('The seed of the Minecraft server'),
		)

		// version
		.addSubcommand(subcommand => subcommand
			.setName('version')
			.setDescription('The version of the minecraft server'),
		),
	category: 'minecraft',

	// Commands
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
		case 'status':
			statusCommand(interaction);
			break;
		case 'backups':
			backupsCommand(interaction);
			break;
		case 'ip':
			ipCommand(interaction);
			break;
		case 'map':
			mapCommand(interaction);
			break;
		case 'seed':
			seedCommand(interaction);
			break;
		case 'version':
			await versionCommand(interaction);
			break;
		}
	},
};


// Backups command
function backupsCommand(interaction) {

	// Estimated days of the latest backups
	const date1 = buildDate;
	const date2 = new Date(new Date(buildDate).setDate(buildDate.getDate() - 1));
	const date3 = new Date(new Date(buildDate).setDate(buildDate.getDate() - 2));
	const date4 = new Date(new Date(buildDate).setDate(buildDate.getDate() - buildDate.getDay()));

	// Finds the earliest backup for that day
	let backup1, backup2, backup3, backup4;
	try {
		backup1 = fs.readdirSync(process.env.backupDirectory).filter(file => file.startsWith(convertDate(date1)))[0];
		backup2 = fs.readdirSync(process.env.backupDirectory).filter(file => file.startsWith(convertDate(date2)))[0];
		backup3 = fs.readdirSync(process.env.backupDirectory).filter(file => file.startsWith(convertDate(date3)))[0];
		backup4 = fs.readdirSync(process.env.backupDirectory).filter(file => file.startsWith(convertDate(date4)))[0];
	} catch (error) {
		logger.child({
			mode: 'SERVER BACKUP',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild.name,
				guildid: interaction.guild.id,
			},
		}).error(error);

		const errorEmbed = newEmbed()
			.setTitle('Error!')
			.setColor(colors.error)
			.setDescription('There was a problem retrieving backups.');

		interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// The text for each backup
	const formatedDate1 = checkBackup(backup1);
	const formatedDate2 = checkBackup(backup2);
	const formatedDate3 = checkBackup(backup3);
	const formatedDate4 = checkBackup(backup4);

	const backupsEmbed = newEmbed()
		.setTitle('Backups')
		.setColor(colors.serverBackupCommand)
		.setDescription('**Daily** backups are made everyday at 4am, and only the last 3 days are kept.\n**Weekly** backups are made every Sunday at 4am, and are kept permanently')
		.addFields({
			name: '__**Daily**__',
			value: `• ${formatedDate1}\n• ${formatedDate2}\n• ${formatedDate3}`,
			inline: true,
		}, {
			name: '__**Weekly**__',
			value: `• ${formatedDate4}`,
			inline: true,
		});

	interaction.editReply({ embeds: [backupsEmbed] });
}

function convertDate(oldDate) {
	const newDate = new Date(oldDate);
	return newDate.toLocaleDateString('lt-LV').replaceAll('-', '.');
}

function checkBackup(backup) {
	let formatedDate;

	// Checks if the backup exists
	if(backup) {
		const date = new Date(backup.slice(0, 4), backup.slice(5, 7) - 1, backup.slice(8, 10), backup.slice(11, 13), backup.slice(14, 16));
		formatedDate = `<t:${date.getTime() / 1000}:f> (<t:${date.getTime() / 1000}:R>)`;
	} else {
		formatedDate = '*No Backup!*';
	}

	return formatedDate;
}


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
	server.ping(1000, 757, (err, res) => {
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
				value: '`25565`',
				inline: true,
			},
			{
				name: 'Platform',
				value: '`Minecraft Java Edition`',
				inline: true,
			},
		);

	interaction.editReply({ embeds: [ipEmbed] });
}

// Map command
function mapCommand(interaction) {
	const mapEmbed = newEmbed()
		.setTitle('Server Map')
		.setColor(colors.serverMapCommand)
		.setDescription(`Server map: [http://${process.env.mcServerIP}:8123](http://${process.env.mcServerIP}:8123)`);

	interaction.editReply({ embeds: [mapEmbed] });
}

// Seed command
function seedCommand(interaction) {
	const seedEmbed = newEmbed()
		.setTitle('Server Seed')
		.setColor(colors.serverSeedCommand)
		.setDescription('Seed: `8783748933437244995`');

	interaction.editReply({ embeds: [seedEmbed] });
}


let data = null;
async function getCurrentVersion() {
	const url = `https://papermc.io/api/v2/projects/paper/versions/${mcServerVersion}`;

	const response = await fetch(url);
	data = await response.json();
}

// Version command
async function versionCommand(interaction) {
	const versionEmbed = newEmbed(0)
		.setTitle('Paper Version')
		.setColor(colors.serverPaperCommand)
		.setDescription(`The server is currently running: **Paper version git-Paper-${data.builds[data.builds.length - 1]} (MC: ${data.version})**`);

	interaction.editReply({ embeds: [versionEmbed] });
}

getCurrentVersion();