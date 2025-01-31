const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const fetch = require('node-fetch');
const buildDate = new Date();

let commitHash = '';
let commitDate = '';

// Gets the currently running commit (assuming the bot is updated)
async function getCurrentBuildCommit() {
	try {
		const response = await fetch('https://api.github.com/repos/Creeperman1524/Pasta-Bot/branches/main');
		data = await response.json();

		commitHash = data.commit.sha.slice(0, 8);
		commitDate = Date.parse(data.commit.commit.author.date);
	} catch (error) {
		logger.child({ mode: 'INFOCOMMAND' }).warn('Could not fetch the current commit hash');
		logger.child({ mode: 'INFOCOMMAND' }).error(error);
		return;
	}
}

getCurrentBuildCommit();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Displays some info about the bot\'s current stats'),
	category: 'information',

	async execute(interaction) {
		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setLabel('Github')
					.setURL('https://github.com/Creeperman1524/Pasta-Bot')
					.setStyle(ButtonStyle.Link),
			);

		// Uptime values
		const currentDate = new Date();
		const elapsed = (currentDate - buildDate) / 1000;
		const seconds = Math.floor(elapsed % 60);
		const minutes = Math.floor(elapsed / 60 % 60);
		const hours = Math.floor(elapsed / 60 / 60);

		const infoEmbed = newEmbed()
			.setTitle('Information')
			.setColor(colors.infoCommand)
			.setDescription('General information for the bot')
			.addFields({
				name: 'Total Servers',
				value: `\`${interaction.client.guilds.cache.size}\``,
				inline: false,
			}, {
				name: 'Uptime',
				value: `\`${hours}h ${minutes}m ${seconds}s\` (<t:${parseInt(buildDate.getTime() / 1000)}:R>)`,
				inline: false,
			}, {
				name: 'Build',
				value: commitHash ? `[${commitHash}](https://github.com/Creeperman1524/Pasta-Bot/commit/${commitHash}) (<t:${commitDate / 1000}:R>)` : 'Could not fetch :(',
				inline: false,
			});

		interaction.editReply({
			embeds: [infoEmbed],
			components: [row],
		});
	},
};
