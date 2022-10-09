const fs = require('fs');
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
				.setRequired(true)
				.setAutocomplete(true),
		)
		.setDefaultPermission(false),
	permissions: ['OWNER'],
	category: 'admin',

	async execute(interaction) {
		// Retrieves the command
		const commandName = interaction.options.getString('command').toLowerCase();
		const command = interaction.client.commands.get(commandName);

		// If the command doesn't exist, return
		if (!command) {
			const noCommandEmbed = newEmbed()
				.setTitle('Incorrect Usage')
				.setColor(colors.warn)
				.setDescription(`There is no command with the name \`${commandName}\``);
			return await interaction.editReply({
				embeds: [noCommandEmbed],
			});
		}

		try {
			// Deletes the cache
			const fileLocation = `../../commands/${await findFile(command.data.name)}`;
			delete require.cache[require.resolve(fileLocation)];

			// Readds the command
			const newCommand = require(fileLocation);
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
				.setDescription(`There was an error while reloading a command \`${command.data.name}\``);
			return await interaction.editReply({
				embeds: [errorEmbed],
			});
		}

		const successEmbed = newEmbed()
			.setTitle('Success')
			.setColor(colors.success)
			.setDescription(`Command \`/${command.data.name}\` was reloaded!`);

		await interaction.editReply({
			embeds: [successEmbed],
		});
	},

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		// Maps the command names to an array
		const choices = interaction.client.commands.map(command => command.data.name);
		const filtered = choices.filter(choice => choice.startsWith(focusedValue));

		// Responds with the command names that match what's currently typed
		await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));

	},

};

async function findFile(commandName) {
	const commandFolder = './src/commands';
	const folders = await fs.readdirSync(commandFolder);

	for(const category of folders) {
		if(await fs.readdirSync(`${commandFolder}/${category}`).includes(`${commandName}.js`)) {
			return `${category}/${commandName}.js`;
		}
	}

	return null;
}