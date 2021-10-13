/* eslint-disable no-undef */
const Discord = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');

const {
	prefix,
	version,
} = require('../config.json');

const name = 'help';
const description = 'Displays a help message';

module.exports = {
	name: name,
	description: description,

	data: new SlashCommandBuilder()
		.setName(name)
		.setDescription(description),

	async execute(message, args) {
		const fields = [];
		const {
			commands,
		} = message.client;

		// If the user doesn't want a specific command
		if (!args.length) {
			// Stores the command name and descriptions into separate arrays
			const names = commands.map(command => command.name);
			const descriptions = commands.map(commandDesc => commandDesc.description);

			for (i = 0; i < names.length; i++) {
				fields.push({
					name: `${prefix}${names[i]}`,
					value: `\`${descriptions[i]}\``,
					// inline: true,
				});
			}

			// Creates the embed for the help page
			const helpEmbed = new Discord.MessageEmbed()
				.setTitle('Commands')
				.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
				.setColor(0xd40d12)
				.setDescription('A list of all the current commands')
				.addFields(fields)
				.setFooter(`Version ${version}`);
			return message.channel.send(helpEmbed);

		}
		const commandName = args[0].toLowerCase();
		const command = commands.get(commandName) || commands.find(c => c.aliases && c.aliases.includes(commandName));

		if (!command) {
			return message.reply('That\'s not a valid command!');
		}

		const preciseFields = [];

		// Aliases
		if (command.aliases) {
			preciseFields.push({
				name: 'Aliases',
				value: `\`${prefix}${command.aliases}\``,
				inline: true,
			});
		}

		// Command arguments
		if (command.args) {
			preciseFields.push({
				name: 'Arguments Required',
				value: `\`${command.args}\``,
				inline: true,
			});
		}

		// Usage
		if (command.usage) {
			preciseFields.push({
				name: 'Usage',
				value: `\`${prefix}${command.name} ${command.usage}\``,
				inline: true,
			});
		}

		// Guild Only
		if (command.guildOnly) {
			preciseFields.push({
				name: 'Guild Only',
				value: `\`${command.guildOnly}\``,
				inline: true,
			});
		}

		// Cool down
		if (command.cooldown) {
			preciseFields.push({
				name: 'Cooldown',
				value: `\`${command.cooldown} seconds\``,
				inline: true,
			});
		}

		// Creates the embed
		const preciseHelpEmbed = new Discord.MessageEmbed()
			.setTitle(`Commands - ${prefix}${commandName}`)
			.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
			.setColor(0xfca503)
			.setDescription(command.description)
			.addFields(preciseFields)
			.setFooter(`Version ${version}`);
		return message.channel.send(preciseHelpEmbed);
	},
};