const { MessageEmbed, Collection, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const games = new Collection();

const emojis = {
	'blank' : '➖',
	'X': '❌',
	'O': '⭕',
};

function createGame(myInteraction) {
	const game = {
		board: [],
		buttons: [],
		player1Turn: false,
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

	// Creates the board of buttons
	const row1 = new MessageActionRow()
		.addComponents(
			createButton('0', emojis.blank, 'SECONDARY'), // XXX
			createButton('1', emojis.blank, 'SECONDARY'), // ---
			createButton('2', emojis.blank, 'SECONDARY'), // ---
		);
	const row2 = new MessageActionRow()
		.addComponents(
			createButton('3', emojis.blank, 'SECONDARY'), // ---
			createButton('4', emojis.blank, 'SECONDARY'), // XXX
			createButton('5', emojis.blank, 'SECONDARY'), // ---
		);
	const row3 = new MessageActionRow()
		.addComponents(
			createButton('6', emojis.blank, 'SECONDARY'), // ---
			createButton('7', emojis.blank, 'SECONDARY'), // ---
			createButton('8', emojis.blank, 'SECONDARY'), // XXX
		);
	game.buttons = [row1, row2, row3];

	const tictactoeEmbed = newEmbed()
		.setTitle('TicTacToe')
		.setColor(colors.yes)
		.setDescription('A game of tictactoe!');

	// Sends the game to the user and waits for input
	game.interaction.editReply({ embeds: [tictactoeEmbed], components:[row1, row2, row3] }).then(async embed => {
		game.embed = embed;

		// Wait for input
	});

}

function createButton(ID, emoji, style) {
	return new MessageButton().setCustomId(ID).setEmoji(emoji).setStyle(style);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tictactoe')
		.setDescription('A tic-tac-toe minigame'),

	execute(interaction) {
		createGame(interaction);
	},
};