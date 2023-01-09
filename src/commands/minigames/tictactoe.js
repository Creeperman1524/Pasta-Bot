const { Collection, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const games = new Collection();

const emojis = {
	'blank' : '➖',
	'X': '❌',
	'O': '⭕',
	'confirm': '✔️',
	'deny': '✖️',
};

// Creates a new game for the user
function createGame(myInteraction) {
	const game = {
		board: [], 					// The internal array of the board
		buttons: [],				// The button representation of the board
		confirmation: [], 			// The buttons to accept or deny the play request
		player1Turn: false, 		// Whether or not it's player1's turn
		player2: null, 				// The user object of player2
		player2Accepted: false, 	// Whether or not player2 accepeted the game
		componentCollector: null,	// The main component collect for the game
		interaction: myInteraction,	// The user command
		embed: null, 				// The game/embed sent
		timeout: 10 * 60000, 		// The expiration timer for the gamee
	};

	// Adds it to the game object
	games.set(myInteraction.id, game);
	startGame(game);
}

// Starts a new game
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

	if(!game.interaction.options.getUser('user')) {
		// Playing against the bot
		startGameBot(game);
	} else {
		// Playing against a user
		startGameUser(game);
	}
}

// A helper function to add buttons
function createButton(ID, emoji, style) {
	return new MessageButton().setCustomId(ID).setEmoji(emoji).setStyle(style);
}

// Initializes the game to play agains the bot
function startGameBot(game) {
	game.player2 = 'bot';

	console.log('playing against bot');

	// TODO: initialize the game for the bot
}

// Initializes the game to play against another user
function startGameUser(game) {
	game.player2 = game.interaction.options.getUser('user');

	const confirmationRow = new MessageActionRow()
		.addComponents(
			createButton('yes', emojis.confirm, 'SUCCESS'),
			createButton('no', emojis.deny, 'DANGER'),
		);

	// Embed to ask player2
	const requestEmbed = newEmbed()
		.setTitle('Tic-Tac-Toe')
		.setColor(colors.tictactoeCommand)
		.setDescription(`<@${game.interaction.user.id}> is challenging you to a game!\nReact below if you wish to accept!`)
		.addFields({
			name: 'Time to Accept',
			value: `<t:${Math.round((new Date().getTime() + 60000) / 1000)}:R>`,
			inline: true,
		});

	// Sends the game to the channel and waits for confirmation
	game.interaction.editReply({ content: `<@${game.player2.id}>`, embeds: [requestEmbed], components:[confirmationRow] }).then(async embed => {
		game.embed = embed;

		// Waits to accept request
		const confirmationCollector = embed.createMessageComponentCollector({ componentType: 'BUTTON', time: 1 * 60000 });
		confirmationCollector.on('collect', (button) => {
			button.deferUpdate();
			if(button.user.id !== game.player2.id) return;

			if(button.customId == 'no' && !game.player2Accepted) deniedRequest(game, false);

			game.player2Accepted = true;
			confirmationCollector.stop(); // Disposes of the collector

			// TODO: initialize the game board, awaitInput()
		});

		// Ran out of time
		confirmationCollector.on('end', () => {
			if(!game.player2Accepted) deniedRequest(game, true);
		});
	});
}

// If the user denies the request, delete the game from memory
function deniedRequest(game, timeout) {
	const notAcceptEmbed = newEmbed()
		.setTitle(timeout ? 'Request not accepted!' : 'Request denied!')
		.setColor(colors.tictactoeCommand)
		.setDescription(`<@${game.player2.id}> did not accept the request :(`);

	game.interaction.editReply({ embeds: [notAcceptEmbed], components: [] });

	games.delete(game.interaction.id);
}

function awaitInput(game) {
	game.componentCollector = game.embed.createMessageComponentCollector({ componentType: 'BUTTON', time: game.timeout });

	game.componentCollector.on('collect', (button) => {
		button.deferUpdate();

		// TODO: playing the game
	});

	game.componentCollector.on('end', () => {
		// TODO: ran out of time
	});

}

// The discord command bits
module.exports = {
	data: new SlashCommandBuilder()
		.setName('tictactoe')
		.setDescription('A tic-tac-toe minigame')

		// start game
		.addSubcommand(subcommand => subcommand
			.setName('start')
			.setDescription('Start a game of tictactoe')
			.addUserOption(option => option
				.setName('user')
				.setDescription('The user you wish to play against'),
			),
		),

	execute(interaction) {
		switch (interaction.options.getSubcommand()) {
		case 'start':
			createGame(interaction);
			break;
		}

	},
};