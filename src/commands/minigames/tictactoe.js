const { MessageEmbed, Collection, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const games = new Collection();

function createGame(myInteraction) {
	const game = {
		board: [],
		buttons: [],
		componentCollector: null,
		interaction: myInteraction, // The user command
		embed: null, // The game/embed sent
		timeout: 10 * 60000, // The expiration timer for the gamee
	};

	// Adds it to the game object
	games.set(myInteraction.id, game);
	startGame(game);
}

function startGame(game) {
	console.log('Starting game with user ' + game.interaction.user.id);
	game.interaction.editReply({ content: 'Starting game with user ' + game.interaction.user.username });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tictactoe')
		.setDescription('A tic-tac-toe minigame'),

	execute(interaction) {
		createGame(interaction);
	},
};