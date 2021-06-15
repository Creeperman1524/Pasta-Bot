const {
	prefix,
	version,
} = require('../config.json');

const Discord = require('discord.js');

module.exports = {
	name: 'reload',
	description: 'Reloads a specific command script if not working properly',
	aliases: ['restart'],
	args: true,
	usage: ' <command name>',
	execute(message, args) {
		// Retreives the command
		const commandName = args[0].toLowerCase();
		const command = message.client.commands.get(commandName) || message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		// If the command doesn't exist, return
		if (!command) {
			const noCommandEmbed = new Discord.MessageEmbed()
				.setTitle('Incorrect Usage')
				.setColor(0xfdff63)
				.setDescription(`There is no command with the name or alias \`${commandName}\``)
				.setFooter(`Version ${version}`);
			return message.channel.send(noCommandEmbed);
		}

		// Deletes the cache
		delete require.cache[require.resolve(`./${command.name}.js`)];

		// Trys to re-add the command
		try {
			const newCommand = require(`./${command.name}.js`);
			message.client.commands.set(newCommand.name, newCommand);
		} catch (error) {
			console.log(error);
			const errorEmbed = new Discord.MessageEmbed()
				.setTitle('Error')
				.setColor(0xff1414)
				.setDescription(`There was an error while reloading a command \`${command.name}\`:\n\`${error.message}\``)
				.setFooter(`Version ${version}`);
			return message.channel.send(errorEmbed);
		}

		const successEmbed = new Discord.MessageEmbed()
			.setTitle('Success')
			.setColor(0x009f00)
			.setDescription(`Command \`${prefix}${command.name}\` was reloaded!`)
			.setFooter(`Version ${version}`);

		message.channel.send(successEmbed);
	},
};