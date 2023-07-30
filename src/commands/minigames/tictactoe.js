const { Collection, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
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

	'currentPlayer': '😎',
	'waitingPlayer': '👤',
	'currentBot': '🍝',
	'waitingBot': '👤',
};

// Creates a new game for the user
function createGame(myInteraction) {
	const game = {
		board: [], 					// The internal array of the board
		buttons: [],				// The button representation of the board
		confirmation: [], 			// The buttons to accept or deny the play request
		player1Turn: true,	 		// Whether or not it's player1's turn
		player1: null,				// THe user object of player1
		player2: null, 				// The user object of player2
		bot: false,					// Whether the game is against the bot
		player2Accepted: false, 	// Whether or not player2 accepted the game
		winner: 0,					// The winner of the game (1 for p1, -2 for p2, 0 for none, 2 for tie)
		componentCollector: null,	// The main component collect for the game
		interaction: myInteraction,	// The user command
		embed: null, 				// The game/embed sent
		timeout: 10 * 60000, 		// The expiration timer for the game
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
	game.player1 = game.interaction.user;

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

// Initializes the game to play against the bot
function startGameBot(game) {
	game.player2 = game.interaction.client.user;
	game.bot = true;

	game.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

	const tictactoeEmbed = newEmbed()
		.setTitle('Tic-Tac-Toe')
		.setColor(colors.tictactoeCommand)
		.setDescription(`${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${emojis.waitingBot}`)
		.addFields({
			name: 'Time Left',
			value: `<t:${Math.round((new Date().getTime() + game.timeout) / 1000)}:R>`,
			inline: true,
		});

	// Sends the game
	game.interaction.editReply({ embeds : [tictactoeEmbed], components: game.buttons }).then(async e => {
		game.embed = e;

		// Waits for the user's input
		awaitInput(game);
	});
}

// Initializes the game to play against another user
function startGameUser(game) {
	game.player2 = game.interaction.options.getUser('user');

	// Tries to play against themselves or a bot
	if(game.player2.id == game.player1.id || game.player2.bot) {
		const invalidUser = newEmbed()
			.setTitle('Invalid User!')
			.setColor(colors.error)
			.setDescription('You cannot play against that user!');

		game.interaction.editReply({ embeds: [invalidUser], components: [] });
		games.delete(game.interaction.id);
		return;
	}

	const confirmationRow = new MessageActionRow()
		.addComponents(
			createButton('yes', emojis.confirm, 'SUCCESS'),
			createButton('no', emojis.deny, 'DANGER'),
		);

	// Embed to ask player2
	const requestEmbed = newEmbed()
		.setTitle('Tic-Tac-Toe Duel Request')
		.setColor(colors.tictactoeCommand)
		.setDescription(`<@${game.player1.id}> is challenging you to a game!\nClick below if you wish to accept!`)
		.addFields({
			name: 'Time to Accept',
			value: `<t:${Math.round((new Date().getTime() + 60000) / 1000)}:R>`,
			inline: true,
		});

	// Sends the game to the channel and waits for confirmation
	game.interaction.editReply({ content: `<@${game.player2.id}>`, embeds: [requestEmbed], components:[confirmationRow] }).then(async embed => {

		// Waits to accept request
		const confirmationCollector = embed.createMessageComponentCollector({ componentType: 'BUTTON', time: 1 * 60000 });
		confirmationCollector.on('collect', (button) => {
			button.deferUpdate();
			if(button.user.id !== game.player2.id) return;

			if(button.customId == 'no' && !game.player2Accepted) deniedRequest(game, false);

			// Player2 accepted request
			game.player2Accepted = true;
			confirmationCollector.stop(); // Disposes of the collector

			game.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

			const tictactoeEmbed = newEmbed()
				.setTitle('Tic-Tac-Toe')
				.setColor(colors.tictactoeCommand)
				.setDescription(`${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${emojis.waitingPlayer}`)
				.addFields({
					name: 'Time Left',
					value: `<t:${Math.round((new Date().getTime() + game.timeout) / 1000)}:R>`,
					inline: true,
				});

			// Sends the game
			game.interaction.editReply({ embeds : [tictactoeEmbed], components: game.buttons }).then(async e => {
				game.embed = e;

				// Waits for the user's input
				awaitInput(game);
			});

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

	// Detects and sends the move the player wants
	game.componentCollector.on('collect', (button) => {
		button.deferUpdate();
		if((game.player1Turn && button.user.id !== game.player1.id) || (!game.player1Turn && button.user.id !== game.player2.id)) return; // Used linear algebra solver to invert this
		gameLoop(game, button.customId);
	});

	// When the timer runs out/the interaction or channel is deleted
	game.componentCollector.on('end', () => {
		// Ran out of time with no winner
		if(game.winner == 0) {
			lose(game);
		}
	});
}

async function gameLoop(game, move) {
	// Converts from 0-8 to board coordinates
	const x = move % 3;
	const y = Math.floor(move / 3);

	// Updates the internal board and checks for a winner
	game.board[y][x] = game.player1Turn ? 1 : -1;

	const winner = checkWinner(game.board);
	game.winner = winner;

	// Updates display
	updateDisplay(game, game.board);

	// Someone won the game
	if(game.winner != 0) {
		win(game);
		return;
	} else {
		// No winners yet

		// If it's player1's turn, set up the board for player2, vice versa
		let description;
		if(game.player1Turn) {
			description = `${emojis.waitingPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${game.bot ? emojis.currentBot : emojis.currentPlayer}`;
		} else {
			description = `${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${game.bot ? emojis.waitingBot : emojis.waitingPlayer}`;
		}

		// Resend message
		const lastEmbed = game.embed.embeds[0];
		const embed = new MessageEmbed(lastEmbed).setDescription(description);

		game.interaction.editReply({ embeds: [embed], components: game.buttons });

		// Flips the player's turn
		game.player1Turn = !game.player1Turn;
	}

	if(!game.bot || game.player1Turn) return;

	// Bot's move
	const botMove = findBestMove(game);
	await sleep(1000);
	gameLoop(game, botMove);

}

// Sleep function for a small pause
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Finds the best move for the bot to make (minimizer)
function findBestMove(game) {
	let bestEval = 99;
	let bestMove = -1; // 0-9

	// Tries to make all possible moves
	for(let y = 0; y < 3; y++) {
		for(let x = 0; x < 3; x++) {
			if(game.board[y][x] != 0) continue; // Already a move there

			game.board[y][x] = -1; // Makes the move
			const moveEval = MinimaxAlphaBeta(game.board, 0, -99, 99, true); // Current depth is 0 (start), bot made move so it is maximizing player

			if(moveEval < bestEval) { // Minimizing
				bestEval = moveEval;
				bestMove = (y * 3) + (x % 3);
			}

			game.board[y][x] = 0; // Unmake the move
		}
	}

	return bestMove;
}

// Evaluates how good a move is by seeing if it can win by playing every single game
// Player = maximizer, bot = minimizer
function MinimaxAlphaBeta(board, depth, alpha, beta, isMaximizingPlayer) {
	const score = checkWinner(board);

	if(score == 1) return (score * 10) - depth; // Player won
	if(score == -1) return (score * 10) + depth; // Bot won
	if(score == 2) return 0; // Tie

	if(isMaximizingPlayer) {
		// Player is maximizing
		let maxEval = -99;

		// Tries every possible move on the board
		for(let y = 0; y < 3; y++) {
			for(let x = 0; x < 3; x++) {
				if(board[y][x] != 0) continue; // Already a move there

				board[y][x] = 1; // Makes the move

				// Evaluates the move
				const e = MinimaxAlphaBeta(board, depth + 1, alpha, beta, false);
				maxEval = Math.max(maxEval, e);

				board[y][x] = 0; // Unmake move

				// Trim tree if a better move exists elsewhere
				alpha = Math.max(alpha, e);
				if (beta <= alpha) break;
			}
		}

		return maxEval;
	} else {
		// Bot is minimizing
		let minEval = 99;

		// Tries every possible move on the board
		for(let y = 0; y < 3; y++) {
			for(let x = 0; x < 3; x++) {
				if(board[y][x] != 0) continue; // Already a move there

				board[y][x] = -1; // Makes the move

				// Evaluates the move
				const e = MinimaxAlphaBeta(board, depth + 1, alpha, beta, true);
				minEval = Math.min(minEval, e);

				board[y][x] = 0; // Unmake move

				// Trim tree if a better move exists elsewhere
				beta = Math.min(beta, e);
				if(beta <= alpha) break;
			}
		}

		return minEval;
	}
}

// Converts the board to discord buttons
function updateDisplay(game, board) {
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			const pos = board[y][x];

			// Sets the buttons
			game.buttons[y].components[x].setStyle(
				pos == 0 ? 'SECONDARY' : 'PRIMARY',
			).setEmoji(
				pos == 0 ? emojis.blank : pos == -1 ? emojis.O : emojis.X,
			).setDisabled(pos != 0);
		}
	}
}

// Checks if there is a winner for the current board
// Returns 1 for player1, -1 for player2, 2, for tie, 0 for none
function checkWinner(board) {
	let winner = 0;

	// Rows
	for (let y = 0; y < 3; y++) {
		if(board[y][0] == board[y][1] && board[y][0] == board[y][2] && board[y][0] != 0) winner = board[y][0];
	}

	// Columns
	for (let x = 0; x < 3; x++) {
		if(board[0][x] == board[1][x] && board[0][x] == board[2][x] && board[0][x] != 0) winner = board[0][x];
	}

	// Positive diagonal
	if (board[2][0] == board[1][1] && board[2][0] == board[0][2]) winner = board[2][0];

	// Negative diagonal
	if (board[0][0] == board[1][1] && board[0][0] == board[2][2]) winner = board[0][0];

	let full = true;
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			if(board[y][x] == 0) full = false;
		}
	}

	if(full && winner == 0) winner = 2;
	return winner;
}

function displayWinningPositions(game, board) {
	// Rows
	for (let y = 0; y < 3; y++) {
		if(board[y][0] == board[y][1] && board[y][0] == board[y][2] && board[y][0] != 0) {
			game.buttons[y].components[0].setStyle('SUCCESS');
			game.buttons[y].components[1].setStyle('SUCCESS');
			game.buttons[y].components[2].setStyle('SUCCESS');
		}
	}

	// Columns
	for (let x = 0; x < 3; x++) {
		if(board[0][x] == board[1][x] && board[0][x] == board[2][x] && board[0][x] != 0) {
			game.buttons[0].components[x].setStyle('SUCCESS');
			game.buttons[1].components[x].setStyle('SUCCESS');
			game.buttons[2].components[x].setStyle('SUCCESS');
		}
	}

	// Positive diagonal
	if (board[2][0] == board[1][1] && board[2][0] == board[0][2]) {
		game.buttons[2].components[0].setStyle('SUCCESS');
		game.buttons[1].components[1].setStyle('SUCCESS');
		game.buttons[0].components[2].setStyle('SUCCESS');
	}

	// Negative diagonal
	if (board[0][0] == board[1][1] && board[0][0] == board[2][2]) {
		game.buttons[0].components[0].setStyle('SUCCESS');
		game.buttons[1].components[1].setStyle('SUCCESS');
		game.buttons[2].components[2].setStyle('SUCCESS');
	}

}

// Ends the game after someone wins
function win(game) {
	displayWinningPositions(game, game.board);

	// TODO: save data

	// Disables all buttons
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			game.buttons[y].components[x].setDisabled(true);
		}
	}

	// Displays the winner
	let description;
	if(game.winner == 2) {
		description = 'Tie!';
	} else {
		description = game.winner == 1 ? `<@${game.player1.id}> wins! Sorry <@${game.player2.id}>!` : `<@${game.player2.id}> wins! Sorry <@${game.player1.id}>!`;
	}

	// Updates the message
	const lastEmbed = game.embed.embeds[0];
	const embed = new MessageEmbed(lastEmbed).setDescription(`${description}\nThanks for playing! :grin:`);
	embed.fields = [];

	// Removes the game from memory
	game.interaction.editReply({ embeds: [embed], components: game.buttons });
	games.delete(game.interaction.id);
}

// Ends the game if someone takes too long
function lose(game) {

	// TODO: save data

	// Disables all buttons
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			game.buttons[y].components[x].setDisabled(true);
		}
	}

	// Determines who took too long
	// * Someone could wait until the end of the timer, make a move, and other player loses
	const loser = game.player1Turn ? game.player1 : game.player2;

	const description = `<@${loser.id}> took too long!`;

	// Updates the message
	const lastEmbed = game.embed.embeds[0];
	const embed = new MessageEmbed(lastEmbed).setDescription(`${description}\nThanks for playing! :grin:`);
	embed.fields = [];

	// Removes the game from memory
	game.interaction.editReply({ embeds: [embed], components: game.buttons });
	games.delete(game.interaction.id);
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