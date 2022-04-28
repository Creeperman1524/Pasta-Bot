const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

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
	category: 'information',

	async execute(interaction) {
		// Retreives the command
		const commandName = interaction.options.getString('command').toLowerCase();
		const command = interaction.client.commands.get(commandName);

		// If the command doesn't exist, return
		if (!command) {
			const noCommandEmbed = newEmbed()
				.setTitle('Incorrect Usage')
				.setColor(colors.warn)
				.setDescription(`There is no command with the name \`${commandName}\``);
			return interaction.reply({
				embeds: [noCommandEmbed],
			});
		}

		// Deletes the cache
		// TODOD: FIX WITH COMMAND CATEGORIES
		delete require.cache[require.resolve(`./${command.data.name}.js`)];

		// Trys to re-add the command
		try {
			const newCommand = require(`./${command.data.name}.js`);
			interaction.client.commands.set(newCommand.name, newCommand);
		} catch (error) {
			logger.child({
				mode: 'RELOAD',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild.name,
					guildid: interaction.guild.id,
				},
			}).error(error);

			const errorEmbed = newEmbed()
				.setTitle('Error')
				.setColor(colors.error)
				.setDescription(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
			return interaction.reply({
				embeds: [errorEmbed],
			});
		}

		const successEmbed = newEmbed()
			.setTitle('Success')
			.setColor(colors.success)
			.setDescription(`Command \`/${command.data.name}\` was reloaded!`);

		interaction.reply({
			embeds: [successEmbed],
		});
	},
};