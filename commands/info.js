const Discord = require('discord.js');
const {
	version,
} = require('../config.json');

const buildDate = new Date();

module.exports = {
	name: 'info',
	description: 'Displays some info about the bot\'s current stats',
	execute(message) {
		const infoEmbed = new Discord.MessageEmbed()
			.setTitle('Information')
			.setColor(0x0088ff)
			.addFields({
				name: 'Version',
				value: `${version}`,
			}, {
				name: 'Creator',
				value: 'Creeperman1524',
			})
			.setDescription('All the information you need for this bot')
			.setTimestamp(buildDate)
			.setFooter(`Version ${version}`);
		message.channel.send(infoEmbed);
	},
};