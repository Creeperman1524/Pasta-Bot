const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { version } = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a specific command script if not working properly')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload')
				.setRequired(true),
		)
		.setDefaultPermission(false),
	permissions: ['OWNER'],

	async execute(interaction) {
		// Retreives the command
		const commandName = interaction.options.getString('command').toLowerCase();
		const command = interaction.client.commands.get(commandName);

		// If the command doesn't exist, return
		if (!command) {
			const noCommandEmbed = new MessageEmbed()
				.setTitle('Incorrect Usage')
				.setColor(0xfdff63)
				.setDescription(`There is no command with the name \`${commandName}\``)
				.setFooter(`Version ${version}`);
			return interaction.reply({
				embeds: [noCommandEmbed],
			});
		}

		// Deletes the cache
		delete require.cache[require.resolve(`./${command.data.name}.js`)];

		// Trys to re-add the command
		try {
			const newCommand = require(`./${command.data.name}.js`);
			interaction.client.commands.set(newCommand.name, newCommand);
		} catch (error) {
			console.log(error);
			const errorEmbed = new MessageEmbed()
				.setTitle('Error')
				.setColor(0xff1414)
				.setDescription(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``)
				.setFooter(`Version ${version}`);
			return interaction.reply({
				embeds: [errorEmbed],
			});
		}

		const successEmbed = new MessageEmbed()
			.setTitle('Success')
			.setColor(0x009f00)
			.setDescription(`Command \`/${command.data.name}\` was reloaded!`)
			.setFooter(`Version ${version}`);

		interaction.reply({
			embeds: [successEmbed],
		});
	},
};