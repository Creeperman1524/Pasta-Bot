const Discord = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');

const {
	version,
} = require('../config.json');

const buildDate = new Date();

const name = 'info';
const description = 'Displays some info about the bot\'s current stats';

module.exports = {
	name: name,
	description: description,

	data: new SlashCommandBuilder()
		.setName(name)
		.setDescription(description),

	async execute(message) {
		const infoEmbed = new Discord.MessageEmbed()
			.setTitle('Information')
			.setURL('https://github.com/Creeperman1524/Pasta-Bot')
			.setColor(0x0088ff)
			.addFields({
				name: 'Version',
				value: `${version}`,
			}, {
				name: 'Creator',
				value: 'Creeperman1524',
			}, {
				name: 'Total Servers',
				value: message.client.guilds.cache.size,
			})
			.setDescription('All the information you need for this bot')
			.setTimestamp(buildDate)
			.setFooter(`Version ${version}`);
		message.channel.send(infoEmbed);
	},
};