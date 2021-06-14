const Discord = require('discord.js');
const fetch = require('node-fetch');

const {
	version,
} = require('../config.json');

module.exports = {
	name: 'update',
	description: 'A command to display the current status of the server update',
	aliases: ['serverupdate'],
	args: false,
	usage: '',
	guildOnly: false,
	cooldown: 10,
	async execute(message) {

		let current = 0;
		let total;

		// Gets the data
		const response = await fetch('https://api.github.com/repos/PaperMC/Paper/issues/5785');
		const data = await response.json();

		// Splits off the bullet points
		const split = data.body.split('\r\n-');

		// Loops through each bullet point
		for (let i = 1; i < split.length - 2; i++) {
			total = 7;
			// Checks if each bullet is checked off
			if (split[i].charAt(2) == 'x') {
				current++;
			}
		}

		// Creates the # progress bar
		const nunmHashtags = 20;
		const count = (current / total) * nunmHashtags;
		let hashtags = '[';
		let i = 0;
		while (i < nunmHashtags) {
			i++;
			if (i < count) {
				hashtags += '#';
			} else {
				hashtags += '-';
			}
		}
		hashtags += ']';

		// Puts all of the data together into an embed
		const updateEmbed = new Discord.MessageEmbed()
			.setTitle('1.17 Update Status')
			.setURL('https://github.com/PaperMC/Paper/issues/5785')
			.setColor(0x03fcfc)
			.setDescription('Current status on the PaperMC.io 1.17 release (which the server is dependant on)')
			.addFields({
				name: 'Progress',
				value: '```ini\n' + hashtags + '\n```',
			}, {
				name: 'Current Development',
				value: split[current + 1].substring(4),
			})
			.setTimestamp(data.updated_at)
			.setFooter(`Version ${version}`);
		message.channel.send(updateEmbed);
	},
};