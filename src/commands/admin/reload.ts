import fs from 'fs';
import { SlashCommandBuilder } from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { logger } from '../../logging';
import { Command } from '../../util/types/command';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a specific command script if not working properly')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command to reload')
				.setRequired(true)
				.setAutocomplete(true)
		)
		.setDefaultMemberPermissions(0), // TODO: this should be updated with better permission
	category: 'admin',

	async execute(interaction) {
		interaction.editReply('This feature has been discontinued (for now). Sorry!');
		return;
		// Retrieves the command
		const commandName = interaction.options.getString('command')?.toLowerCase();

		// If the command doesn't exist, return
		if (!commandName) {
			const noCommandEmbed = newEmbed()
				.setTitle('Incorrect Usage')
				.setColor(colors.warn)
				.setDescription(`There is no command with the name \`${commandName}\``);
			return await interaction.editReply({
				embeds: [noCommandEmbed]
			});
		}

		// @ts-expect-error This is because the code is unreacable
		const command = interaction.client.commands.get(commandName);

		try {
			const fileLocation = `../../commands/${await findFile(command?.data.name ?? '')}`;
			// Bypasses the module cache by adding a new timestamp, essentially deleting it and re-adding it
			const newCommandModule = await import(`${fileLocation}?update=${Date.now()}`);
			const newCommand: Command = newCommandModule.default;

			interaction.client.commands.set(newCommand.data.name, newCommand);
		} catch (error) {
			logger
				.child({
					mode: 'RELOAD',
					metaData: {
						user: interaction.user.username,
						userid: interaction.user.id,
						guild: interaction.guild?.name,
						guildid: interaction.guild?.id
					}
				})
				.error(error);

			const errorEmbed = newEmbed()
				.setTitle('Error')
				.setColor(colors.error)
				.setDescription(
					`There was an error while reloading a command \`${command?.data.name}\``
				);
			return await interaction.editReply({
				embeds: [errorEmbed]
			});
		}

		const successEmbed = newEmbed()
			.setTitle('Success')
			.setColor(colors.success)
			.setDescription(`Command \`/${command?.data.name}\` was reloaded!`);

		await interaction.editReply({
			embeds: [successEmbed]
		});
	},

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		// Maps the command names to an array
		const choices = interaction.client.commands.map((command) => command.data.name);
		const filtered = choices.filter((choice) => choice.startsWith(focusedValue));

		// Responds with the command names that match what's currently typed
		await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
	}
} as Command;

async function findFile(commandName: string) {
	const commandFolder = './src/commands';
	const folders = fs.readdirSync(commandFolder);

	for (const category of folders) {
		if (fs.readdirSync(`${commandFolder}/${category}`).includes(`${commandName}.js`)) {
			return `${category}/${commandName}.js`;
		}
	}

	return null;
}
