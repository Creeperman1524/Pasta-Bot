const mcping = require('mcping-js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { mcServerPort } = require('../../config.json');
const { mcServerIP, backupsDirectory } = require('../../hidden.json');
const { newEmbed, colors } = require('../../util/embeds.js');

const fs = require('fs');
const fetch = require('node-fetch');

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

	// Commands
	async execute(interaction) {
		await interaction.deferReply();

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
	let date1 = buildDate;
	let date2 = new Date(new Date(buildDate).setDate(buildDate.getDate() - 1));
	let date3 = new Date(new Date(buildDate).setDate(buildDate.getDate() - 2));
	let date4 = new Date(new Date(buildDate).setDate(buildDate.getDate() - buildDate.getDay()));

	// Finds the earliest backup for that day
	const backup1 = fs.readdirSync(backupsDirectory).filter(file => file.startsWith(convertDate(date1)))[0];
	const backup2 = fs.readdirSync(backupsDirectory).filter(file => file.startsWith(convertDate(date2)))[0];
	const backup3 = fs.readdirSync(backupsDirectory).filter(file => file.startsWith(convertDate(date3)))[0];
	const backup4 = fs.readdirSync(backupsDirectory).filter(file => file.startsWith(convertDate(date4)))[0];

	// The embed date1
	let formatedDate1 = '';
	let formatedDate2 = '';
	let formatedDate3 = '';
	let formatedDate4 = '';

	// Changes dates to fit the format
	if(backup1) {
		// If there is a backup for that date
		date1 = new Date(backup1.slice(0, 4), backup1.slice(5, 7) - 1, backup1.slice(8, 10), backup1.slice(11, 13), backup1.slice(14, 16));
		formatedDate1 = `${date1.toDateString().slice(0, -5)} ${date1.toTimeString().slice(0, 5)}`;
	} else {
		// If there isn't a backup for that date
		date1 = new Date();
		formatedDate1 = 'No Backup!';
	}

	if(backup2) {
		// If there is a backup for that date
		date2 = new Date(backup2.slice(0, 4), backup2.slice(5, 7) - 1, backup2.slice(8, 10), backup2.slice(11, 13), backup2.slice(14, 16));
		formatedDate2 = `${date2.toDateString().slice(0, -5)} ${date2.toTimeString().slice(0, 5)}`;
	} else {
		// If there isn't a backup for that date
		date2 = new Date();
		formatedDate2 = 'No Backup!';
	}

	if(backup3) {
		// If there is a backup for that date
		date3 = new Date(backup3.slice(0, 4), backup3.slice(5, 7) - 1, backup3.slice(8, 10), backup3.slice(11, 13), backup3.slice(14, 16));
		formatedDate3 = `${date3.toDateString().slice(0, -5)} ${date3.toTimeString().slice(0, 5)}`;
	} else {
		// If there isn't a backup for that date
		date3 = new Date();
		formatedDate3 = 'No Backup!';
	}

	if(backup4) {
		// If there is a backup for that date
		date4 = new Date(backup4.slice(0, 4), backup4.slice(5, 7) - 1, backup4.slice(8, 10), backup4.slice(11, 13), backup4.slice(14, 16));
		formatedDate4 = `${date4.toDateString().slice(0, -5)} ${date4.toTimeString().slice(0, 5)}`;
	} else {
		// If there isn't a backup for that date
		date4 = new Date();
		formatedDate4 = 'No Backup!';
	}


	const line1 = `• ${formatedDate1} (${Math.floor((new Date() - date1) / 3600000)}hrs ago)`;
	const line2 = `• ${formatedDate2} (${Math.floor((new Date() - date2) / 3600000)}hrs ago)`;
	const line3 = `• ${formatedDate3} (${Math.floor((new Date() - date3) / 3600000)}hrs ago)`;
	const line4 = `• ${formatedDate4} (${Math.floor((new Date() - date4) / 3600000)}hrs ago)`;

	const backupsEmbed = newEmbed()
		.setTitle('Backups')
		.setColor(colors.serverBackupCommand)
		.setDescription('**Daily** backups are made everyday at 4am, and only the last 3 days are kept.\n**Weekly** backups are made every Sunday at 4am, and are kept permanently')
		.addFields({
			name: '__**Daily**__',
			value: `${line1}\n${line2}\n${line3}`,
			inline: true,
		}, {
			name: '__**Weekly**__',
			value: `${line4}`,
			inline: true,
		});

	interaction.editReply({ embeds: [backupsEmbed] });
}

function convertDate(oldDate) {
	const newDate = new Date(oldDate);
	return newDate.toLocaleDateString('lt-LV').replaceAll('-', '.');
}


// Status command
function statusCommand(interaction) {
	const ip = interaction.options.getString('ip');

	// Checks if the user input a server
	if (ip == null) {
		const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

		// Pings the server
		pingServer(server, interaction, mcServerIP);

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
				value: `\`${mcServerIP}\``,
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
		.setDescription(`Server map: [http://${mcServerIP}:8123](http://${mcServerIP}:8123)`);

	interaction.editReply({ embeds: [mapEmbed] });
}

// Seed command
function seedCommand(interaction) {
	const seedEmbed = newEmbed()
		.setTitle('Server Seed')
		.setColor(colors.serverSeedCommand)
		.setDescription('Seed: `-2856535938574691800`');

	interaction.editReply({ embeds: [seedEmbed] });
}


let data = null;
async function getCurrentVersion() {
	const url = 'https://papermc.io/api/v2/projects/paper/versions/1.18.2';

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