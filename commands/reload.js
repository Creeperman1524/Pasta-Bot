const {
	prefix,
} = require('../config.json');

module.exports = {
	name: 'reload',
	description: 'Reloads a specific command script if not working properly',
	aliases: ['restart'],
	args: true,
	usage: '[command name]',
	execute(message, args) {
		const commandName = args[0].toLowerCase();
		const command = message.client.commands.get(commandName) || message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		if (!command) return message.channel.send(`There is no command with the name or alias \`${commandName}\`, ${message.author}`);

		delete require.cache[require.resolve(`./${command.name}.js`)];

		try {
			const newCommand = require(`./${command.name}.js`);
			message.client.commands.set(newCommand.name, newCommand);
		}
		catch (error) {
			console.log(error);
			message.channel.send(`There was an error while reloading a command \`${command.name}\`:\n\`${error.message}\``);
		}

		message.channel.send(`Command \`${prefix}${command.name}\` was reloaded!`);
	},
};