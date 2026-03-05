import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { logger } from '../../logging';

import fetch from 'node-fetch';
import { Command } from '../../util/types/command';
const buildDate = new Date();

let commitHash = '';
let commitDate: number;

type GithubData = {
	commit: {
		sha: string;
		commit: {
			author: {
				date: string;
			};
		};
	};
};

// Gets the currently running commit (assuming the bot is updated)
async function getCurrentBuildCommit() {
	try {
		const response = await fetch(
			'https://api.github.com/repos/Creeperman1524/Pasta-Bot/branches/main'
		);
		const data = (await response.json()) as GithubData;

		commitHash = data.commit.sha.slice(0, 8);
		commitDate = Date.parse(data.commit.commit.author.date);
	} catch (error) {
		logger.child({ mode: 'INFOCOMMAND' }).warn('Could not fetch the current commit hash');
		logger.child({ mode: 'INFOCOMMAND' }).error(error);
		return;
	}
}

getCurrentBuildCommit();

export default {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription("Displays some info about the bot's current stats"),
	category: 'information',

	async execute(interaction) {
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel('Github')
				.setURL('https://github.com/Creeperman1524/Pasta-Bot')
				.setStyle(ButtonStyle.Link)
		) as ActionRowBuilder<ButtonBuilder>;

		// Uptime values
		const currentDate = new Date();
		const elapsed = (currentDate.getTime() - buildDate.getTime()) / 1000;
		const seconds = Math.floor(elapsed % 60);
		const minutes = Math.floor((elapsed / 60) % 60);
		const hours = Math.floor(elapsed / 60 / 60);

		const infoEmbed = newEmbed()
			.setTitle('Information - changed')
			.setColor(colors.infoCommand)
			.setDescription('General information for the bot')
			.addFields(
				{
					name: 'Total Servers',
					value: `\`${interaction.client.guilds.cache.size}\``,
					inline: false
				},
				{
					name: 'Uptime',
					value: `\`${hours}h ${minutes}m ${seconds}s\` (<t:${(buildDate.getTime() / 1000) | 0}:R>)`, // | 0 is to do floor division
					inline: false
				},
				{
					name: 'Build',
					value: commitHash
						? `[${commitHash}](https://github.com/Creeperman1524/Pasta-Bot/commit/${commitHash}) (<t:${commitDate / 1000}:R>)`
						: 'Could not fetch :(',
					inline: false
				}
			);

		interaction.editReply({
			embeds: [infoEmbed],
			components: [row]
		});
	}
} as Command;
