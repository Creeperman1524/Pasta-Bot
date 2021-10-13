const Discord = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');
const paginationEmbed = require('discord.js-pagination');

// Pages
const serverEmbed = new Discord.MessageEmbed()
	.setTitle('Server')
	.setColor(0x854f2b)
	.setDescription('Welcome to the Pain Minecraft Server! Over the course of almost 1 month, I have planned, researched, coded, and tested many different aspects to hopefully make this a smooth and fun time!')
	.addFields({
		'name': 'Connecting',
		'value': 'IP: `pain2021.us.to`\nPort: `25565` (default)\nVersion: `Minecraft Java Edition`',
		'inline': true,
	}, {
		'name': 'Gamerules',
		'value': 'The world gamerules are the exact same as vanilla.\nA list of those can be found [here](https://minecraft.gamepedia.com/Game_rule)',
		'inline': true,
	}, {
		'name': 'General Info',
		'value': 'Version: `Paper 1.17.1`\nSeed: `4159323061339762196`\nView-distance: `8`\nDifficulty: `Hard`',
		'inline': true,
	}, {
		'name': 'Pasta Bot',
		'value': 'I have connected Pasta Bot to the server! Typing in `p!status` can bring up information about who is currently playing on the server. The server status can even be seen quickly from the bot\'s activity status.',
		'inline': true,
	})
	.setAuthor('Creeperman1524', 'https://github.com/Creeperman1524', 'https://cdn.discordapp.com/attachments/423568858993917977/694902296815075388/image0.jpg');

const datapackEmbed = new Discord.MessageEmbed()
	.setTitle('Datapacks/Plugins')
	.setColor(0x7d5d19)
	.setDescription('I like to keep my servers as close to vanilla as possible, but we do have some quality of life things here!')
	.addFields({
		'name': 'Prometheus (Plugin)',
		'value': 'This is for server data collection/monitoring, you don\'t ever have to worry about this one',
		'inline': true,
	}, {
		'name': 'AFK Display (Datapack)',
		'value': 'Grays out a player\'s name that is not moving for 2.5 minutes.',
		'inline': true,
	}, {
		'name': 'Armor Statues (Datapack)',
		'value': 'Adds a unique book that allows you to alter the properties of armor stands in survival. [Here\'s a guide to use this](https://youtu.be/nV9-_RacnoI?t=144)',
		'inline': true,
	}, {
		'name': 'Chunk Loaders (Datapack)',
		'value': 'Drop a nether star onto a lodstone to load the chunk. Breaking it will stop loading the chunk and give back your nether star.',
		'inline': true,
	}, {
		'name': 'Custom Nether Portals (Datapack)',
		'value': 'Ignite a nether portal any shape and size you want! (Minimum 10 obsidian for the portal)',
		'inline': true,
	}, {
		'name': 'More Mob Heads (Datapack)',
		'value': 'Mobs have a  1% chance to drop their head upon death. Mob heads gained through charged creepers are not dropped.',
		'inline': true,
	}, {
		'name': 'Player Head Drops (Datapack)',
		'value': 'A player will drop their head when killed by another player, or yourself. The item displays who the killer is.',
		'inline': true,
	}, {
		'name': 'Track Raw Stats (Datapack)',
		'value': 'Tracks every statistic in the game in scoreboards to be displayed.',
		'inline': true,
	});

const backupsEmbed = new Discord.MessageEmbed()
	.setTitle('Backups/Rollbacks')
	.setColor(0x696c0e)
	.setDescription('Backups help me create a timeline of the server as well as saving our progress from being lost!')
	.addFields({
		'name': 'Backups',
		'value': 'Backups are made every day at 4am EST. If you are on at this time (god help you), the server should be back within a few minutes.',
		'inline': true,
	}, {
		'name': 'Updates',
		'value': 'The server is also updated to the latest version at the same time as backups are made.',
		'inline': true,
	}, {
		'name': 'Rollbacks',
		'value': 'Contact me if you need to rollback the server for some reason. However, we will lose the entire day\'s worth of progress, so I will confirm with everyone about it.',
		'inline': true,
	});

const limitedEmbed = new Discord.MessageEmbed()
	.setTitle('Limits')
	.setColor(0x477a1e)
	.setDescription('Because of the limited hardware, there are certain limits to the server!')
	.addFields({
		'name': 'World Border',
		'value': 'World border is capped at 10k -10k. due to my limited storage capacity for the server.',
		'inline': true,
	}, {
		'name': 'Player Limit',
		'value': 'The player limit is current capped at 5 players. There are ***20*** people currently whitelisted, so try to keep AFKing time to a minimum',
		'inline': true,
	}, {
		'name': 'Misc',
		'value': 'Things like hacking and xraying are not allowed, and you will be banned if caught. Seed finders are okay to use for building farms and finding certain biomes. Check-in with me if you don\'t think a mod is allowed.',
		'inline': true,
	}, {
		'name': 'Farms',
		'value': 'There is a limited amount of CPU to be shared by everyone on the server, so please make sure to optimize your farms! We don\'t want 10,000 entities sitting around and crash the server. *cough* like someone did before *cough*\n**Also**, the server spawn chunks are disabled for performance reasons. You can still load farms with the chunk loaders from the datapack, but spawn chunk loading is **off**.',
		'inline': true,
	});

const pages = [serverEmbed, datapackEmbed, backupsEmbed, limitedEmbed];

const name = 'server';
const description = 'Displays information about the minecraft server';

module.exports = {
	name: name,
	description: description,

	data: new SlashCommandBuilder()
		.setName(name)
		.setDescription(description),

	async execute(message) {
		paginationEmbed(message, pages);
	},
};