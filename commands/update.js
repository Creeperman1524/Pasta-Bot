const Discord = require('discord.js');
const fetch = require('node-fetch');

const {
	version,
} = require('../config.json');

module.exports = {
	name: 'update',
	description: 'A command to display the most recent update to the paper server',
	aliases: ['serverupdate'],
	args: false,
	guildOnly: false,
	cooldown: 10,
	async execute(message) {

		const url = 'https://papermc.io/api/v2/projects/paper/versions/1.17/';

		// Gets the data
		const response = await fetch(url);
		const data = await response.json();

		const fields = [];
		const updateEmbed = new Discord.MessageEmbed();

		// Retrieves the 5 latest updates
		for (let i = 0; i < 3; i++) {
			// Gets data on each build
			const responseField = await fetch(url + '/builds/' + data.builds[(data.builds.length - 1) - i]);
			const newField = await responseField.json();

			// Pushes new
			fields.push({
				name: `(${newField.build}) - ${newField.changes[0].summary}`,
				value: newField.changes[0].message,
			});

			if (i === 0) {
				updateEmbed.setTimestamp(newField.time);
			}
		}

		updateEmbed.setTitle('Recent 1.17 Paper Updates')
			.setURL('https://papermc.io/downloads')
			.setColor(0x03fcfc)
			.addFields(fields)
			.setDescription('Latest 3 fixes for the paper server')
			.setFooter(`Version ${version}`);

		message.channel.send(updateEmbed);
	},
};