import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	Collection,
	ComponentType,
	EmbedBuilder,
	InteractionCollector,
	Message,
	SlashCommandBuilder,
	User
} from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { logger } from '../../logging';

import database from '../../util/database';
import tictactoeStatsSchema from '../../schemas/tictactoeStats.schema';
import { leaderboardMulti } from '../../util/leaderboard';
import { Command, ModChatInputCommandInteraction } from '../../util/types/command';

const games = new Collection<string, Game>();

const emojis = {
	blank: '➖',
	X: '❌',
	O: '⭕',
	confirm: '✔️',
	deny: '✖️',

	currentPlayer: '😎',
	waitingPlayer: '👤',
	currentBot: '🍝',
	waitingBot: '👤'
};

const botMessages = {
	easy: [
		// 90-50%
		"I'll go easy on you this time 😄",
		"I'll let you have this one… 😏"
	],
	medium: [
		// 50-25%
		"I see you've been improving… 👀",
		"You're still no match for me! 😤",
		'Too hard for you? 🤣'
	],
	hard: [
		// 25-10%
		'Get ready to be destroyed! 😈',
		"I've been practicing for you 😉",
		'You wish you could defeat me! 😆',
		'I. SEE. EVERYTHING 👁️'
	]
};

enum Winner {
	OnGoing,
	Player1,
	Player2,
	Tie
}

type Board = [number[], number[], number[]];

interface Game {
	/**
	 * The internal array of the board
	 */
	board: Board;

	/**
	 * The button representation of the board
	 */
	buttons: [
		ActionRowBuilder<ButtonBuilder>,
		ActionRowBuilder<ButtonBuilder>,
		ActionRowBuilder<ButtonBuilder>
	];

	/**
	 * Whether or not it's player1's turn
	 */
	player1Turn: boolean;

	/**
	 * The user object of player1
	 */
	player1: User;

	/**
	 * The user object of player2
	 */
	player2: User;

	/**
	 * Whether the game is against the bot
	 */
	bot: boolean;

	/**
	 * The difficulty message the bot says
	 */
	botMessage: string;

	/**
	 * The winrate of the player (for bot games)
	 */
	playerWinRate: number;

	/**
	 * Whether or not player2 accepted the game
	 */
	player2Accepted: boolean;

	/**
	 * The winner of the game
	 */
	winner: Winner;

	/**
	 * The main component collector for the game
	 */
	componentCollector: InteractionCollector<ButtonInteraction<CacheType>> | null;

	/**
	 * The user command
	 */
	interaction: ModChatInputCommandInteraction;

	/**
	 * The game/embed sent
	 */
	embed: Message<boolean>;

	/**
	 * The expiration timer for the game
	 */
	timeout: number;
}

// Creates a new game for the user
function createGame(myInteraction: ModChatInputCommandInteraction) {
	const game = {
		board: [] as unknown as Board,
		buttons: [] as unknown as [
			ActionRowBuilder<ButtonBuilder>,
			ActionRowBuilder<ButtonBuilder>,
			ActionRowBuilder<ButtonBuilder>
		],
		player1Turn: true,
		player1: null as unknown as User,
		player2: null as unknown as User,
		bot: false,
		botMessage: '',
		playerWinRate: 0.5,
		player2Accepted: false,
		winner: 0,
		componentCollector: null,
		interaction: myInteraction,
		embed: null as unknown as Message,
		timeout: 10 * 60000
	} as Game;

	// Adds it to the game object
	games.set(myInteraction.id, game);
	startGame(game);
}

// Starts a new game
function startGame(game: Game) {
	// Creates the board of buttons
	const row1 = new ActionRowBuilder().addComponents(
		createButton('0', emojis.blank, ButtonStyle.Secondary), // XXX
		createButton('1', emojis.blank, ButtonStyle.Secondary), // ---
		createButton('2', emojis.blank, ButtonStyle.Secondary) // ---
	) as ActionRowBuilder<ButtonBuilder>;
	const row2 = new ActionRowBuilder().addComponents(
		createButton('3', emojis.blank, ButtonStyle.Secondary), // ---
		createButton('4', emojis.blank, ButtonStyle.Secondary), // XXX
		createButton('5', emojis.blank, ButtonStyle.Secondary) // ---
	) as ActionRowBuilder<ButtonBuilder>;
	const row3 = new ActionRowBuilder().addComponents(
		createButton('6', emojis.blank, ButtonStyle.Secondary), // ---
		createButton('7', emojis.blank, ButtonStyle.Secondary), // ---
		createButton('8', emojis.blank, ButtonStyle.Secondary) // XXX
	) as ActionRowBuilder<ButtonBuilder>;
	game.buttons = [row1, row2, row3];
	game.player1 = game.interaction.user;

	if (
		!game.interaction.options.getUser('user') ||
		game.interaction.options.getUser('user')?.id == game.interaction.client.user.id
	) {
		// Playing against the bot
		startGameBot(game);
	} else {
		// Playing against a user
		startGameUser(game);
	}
}

// A helper function to add buttons
function createButton(ID: string, emoji: string, style: ButtonStyle) {
	return new ButtonBuilder().setCustomId(ID).setEmoji(emoji).setStyle(style);
}

// Gets the bot winrate of the player
async function getWinRate(game: Game) {
	const userData = await tictactoeStatsSchema.findOne({ userID: game.player1.id });

	if (!userData || userData.totalBot == 0) return 0.5;

	return userData.winsBot / userData.totalBot;
}

function generateRandomMessage(mistakeChance: number): string {
	if (mistakeChance < 0.25) {
		return botMessages['hard'][Math.floor(Math.random() * botMessages['hard'].length)];
	} else if (mistakeChance < 0.5) {
		return botMessages['medium'][Math.floor(Math.random() * botMessages['medium'].length)];
	} else {
		return botMessages['easy'][Math.floor(Math.random() * botMessages['easy'].length)];
	}
}

// Initializes the game to play against the bot
async function startGameBot(game: Game) {
	game.player2 = game.interaction.client.user;
	game.bot = true;

	game.playerWinRate = await getWinRate(game);
	game.botMessage = generateRandomMessage(await determineMistakeChance(game.playerWinRate));

	game.board = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];

	const tictactoeEmbed = newEmbed()
		.setTitle('Tic-Tac-Toe')
		.setColor(colors.tictactoeCommand)
		.setDescription(
			`${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${emojis.waitingBot}\n${game.botMessage}`
		)
		.addFields({
			name: 'Time Left',
			value: `<t:${Math.round((new Date().getTime() + game.timeout) / 1000)}:R>`,
			inline: true
		});

	// Sends the game
	game.interaction
		.editReply({ embeds: [tictactoeEmbed], components: game.buttons })
		.then(async (e) => {
			game.embed = e;

			// Waits for the user's input
			awaitInput(game);
		});
}

// Initializes the game to play against another user
function startGameUser(game: Game) {
	const player2 = game.interaction.options.getUser('user');

	// Tries to play against themselves or a bot
	if (!player2 || player2.id == game.player1.id || player2.bot) {
		const invalidUser = newEmbed()
			.setTitle('Invalid User!')
			.setColor(colors.error)
			.setDescription('You cannot play against that user!');

		game.interaction.editReply({ embeds: [invalidUser], components: [] });
		games.delete(game.interaction.id);
		return;
	}

	game.player2 = player2;

	const confirmationRow = new ActionRowBuilder().addComponents(
		createButton('yes', emojis.confirm, ButtonStyle.Success),
		createButton('no', emojis.deny, ButtonStyle.Danger)
	) as ActionRowBuilder<ButtonBuilder>;

	// Embed to ask player2
	const requestEmbed = newEmbed()
		.setTitle('Tic-Tac-Toe Duel Request')
		.setColor(colors.tictactoeCommand)
		.setDescription(
			`<@${game.player1.id}> is challenging you to a game!\nClick below if you wish to accept!`
		)
		.addFields({
			name: 'Time to Accept',
			value: `<t:${Math.round((new Date().getTime() + 60000) / 1000)}:R>`,
			inline: true
		});

	// Sends the game to the channel and waits for confirmation
	game.interaction
		.editReply({
			content: `<@${game.player2.id}>`,
			embeds: [requestEmbed],
			components: [confirmationRow]
		})
		.then(async (embed) => {
			// Waits to accept request
			const confirmationCollector = embed.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 1 * 60000
			});
			confirmationCollector.on('collect', (button) => {
				button.deferUpdate();
				if (button.user.id !== game.player2.id) return;

				if (button.customId == 'no' && !game.player2Accepted) deniedRequest(game, false);

				// Player2 accepted request
				game.player2Accepted = true;
				confirmationCollector.stop(); // Disposes of the collector

				game.board = [
					[0, 0, 0],
					[0, 0, 0],
					[0, 0, 0]
				];

				const tictactoeEmbed = newEmbed()
					.setTitle('Tic-Tac-Toe')
					.setColor(colors.tictactoeCommand)
					.setDescription(
						`${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${emojis.waitingPlayer}`
					)
					.addFields({
						name: 'Time Left',
						value: `<t:${Math.round((new Date().getTime() + game.timeout) / 1000)}:R>`,
						inline: true
					});

				// Sends the game
				game.interaction
					.editReply({ embeds: [tictactoeEmbed], components: game.buttons })
					.then(async (e) => {
						game.embed = e;

						// Waits for the user's input
						awaitInput(game);
					});
			});

			// Ran out of time
			confirmationCollector.on('end', () => {
				if (!game.player2Accepted) deniedRequest(game, true);
			});
		});
}

// If the user denies the request, delete the game from memory
function deniedRequest(game: Game, timeout: boolean) {
	const notAcceptEmbed = newEmbed()
		.setTitle(timeout ? 'Request not accepted!' : 'Request denied!')
		.setColor(colors.tictactoeCommand)
		.setDescription(`<@${game.player2.id}> did not accept the request :(`);

	game.interaction.editReply({ embeds: [notAcceptEmbed], components: [] });

	games.delete(game.interaction.id);
}

function awaitInput(game: Game) {
	game.componentCollector = game.embed.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: game.timeout
	});

	// Detects and sends the move the player wants
	game.componentCollector.on('collect', (button) => {
		button.deferUpdate();
		if (
			(game.player1Turn && button.user.id !== game.player1.id) ||
			(!game.player1Turn && button.user.id !== game.player2.id)
		)
			return; // Used linear algebra solver to invert this
		gameLoop(game, parseInt(button.customId));
	});

	// When the timer runs out/the interaction or channel is deleted
	game.componentCollector.on('end', () => {
		// Ran out of time with no winner
		if (game.winner == 0) {
			ranOutOfTime(game);
		}
	});
}

async function gameLoop(game: Game, move: number) {
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
	if (game.winner != Winner.OnGoing) {
		gameEnded(game);
		return;
	} else {
		// No winners yet

		// If it's player1's turn, set up the board for player2, vice versa
		let description;
		if (game.player1Turn) {
			description = `${emojis.waitingPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${game.bot ? emojis.currentBot : emojis.currentPlayer}`;
		} else {
			description = `${emojis.currentPlayer} <@${game.player1.id}> vs. <@${game.player2.id}> ${game.bot ? emojis.waitingBot : emojis.waitingPlayer}`;
		}

		if (game.botMessage != '') description += `\n${game.botMessage}`;

		// Resend message
		const lastEmbed = game.embed.embeds[0];
		const embed = EmbedBuilder.from(lastEmbed).setDescription(description);

		game.interaction.editReply({ embeds: [embed], components: game.buttons });

		// Flips the player's turn
		game.player1Turn = !game.player1Turn;
	}

	if (!game.bot || game.player1Turn) return;

	// Bot's move
	const mistakeChance = await determineMistakeChance(game.playerWinRate);
	let botMove = -1;

	if (Math.random() > mistakeChance) {
		botMove = findBestMove(game);
	} else {
		botMove = findRandomMove(game);
	}

	await sleep(Math.random() * 1000);
	gameLoop(game, botMove);
}

/**
 * Determines the bot's chance of making a mistake based on the player's win rate
 *  - 0% winrate, 90% chance of mistake
 *  - 100% winrate, 10% chance of mistake
 *  - 50% default with no winrate
 *
 * mistake chance = 0.9 * 0.111 ^ winrate
 */
function determineMistakeChance(winRate: number): number {
	return 0.9 * Math.pow(0.1111, winRate);
}

// Returns a random valid move
function findRandomMove(game: Game) {
	const validMoves = [];

	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			if (game.board[y][x] != 0) continue; // Already a move there
			validMoves.push(y * 3 + (x % 3));
		}
	}

	return validMoves[Math.floor(Math.random() * validMoves.length)];
}

// Sleep function for a small pause
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Finds the best move for the bot to make (minimizer)
function findBestMove(game: Game) {
	let bestEval = 99;
	let bestMove = -1; // 0-8

	// Tries to make all possible moves
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			if (game.board[y][x] != 0) continue; // Already a move there

			game.board[y][x] = -1; // Makes the move
			const moveEval = MinimaxAlphaBeta(game.board, 0, -99, 99, true); // Current depth is 0 (start), bot made move so it is maximizing player

			if (moveEval < bestEval) {
				// Minimizing
				bestEval = moveEval;
				bestMove = y * 3 + (x % 3);
			}

			game.board[y][x] = 0; // Unmake the move
		}
	}

	return bestMove;
}

// Evaluates how good a move is by seeing if it can win by playing every single game
// Player = maximizer, bot = minimizer
function MinimaxAlphaBeta(
	board: Board,
	depth: number,
	alpha: number,
	beta: number,
	isMaximizingPlayer: boolean
) {
	const score = checkWinner(board);

	if (score == Winner.Player1) return 1 * 10 - depth; // Player won
	if (score == Winner.Player2) return -1 * 10 + depth; // Bot won
	if (score == Winner.Tie) return 0; // Tie

	if (isMaximizingPlayer) {
		// Player is maximizing
		let maxEval = -99;

		// Tries every possible move on the board
		for (let y = 0; y < 3; y++) {
			for (let x = 0; x < 3; x++) {
				if (board[y][x] != 0) continue; // Already a move there

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
		for (let y = 0; y < 3; y++) {
			for (let x = 0; x < 3; x++) {
				if (board[y][x] != 0) continue; // Already a move there

				board[y][x] = -1; // Makes the move

				// Evaluates the move
				const e = MinimaxAlphaBeta(board, depth + 1, alpha, beta, true);
				minEval = Math.min(minEval, e);

				board[y][x] = 0; // Unmake move

				// Trim tree if a better move exists elsewhere
				beta = Math.min(beta, e);
				if (beta <= alpha) break;
			}
		}

		return minEval;
	}
}

// Converts the board to discord buttons
function updateDisplay(game: Game, board: Board) {
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			const pos = board[y][x];

			// Sets the buttons
			game.buttons[y].components[x]
				.setStyle(pos == 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
				.setEmoji(pos == 0 ? emojis.blank : pos == -1 ? emojis.O : emojis.X)
				.setDisabled(pos != 0);
		}
	}
}

// Checks if there is a winner for the current board
function checkWinner(board: Board): Winner {
	let winner = 0;

	// Rows
	for (let y = 0; y < 3; y++) {
		if (board[y][0] == board[y][1] && board[y][0] == board[y][2] && board[y][0] != 0)
			winner = board[y][0];
	}

	// Columns
	for (let x = 0; x < 3; x++) {
		if (board[0][x] == board[1][x] && board[0][x] == board[2][x] && board[0][x] != 0)
			winner = board[0][x];
	}

	// Positive diagonal
	if (board[2][0] == board[1][1] && board[2][0] == board[0][2]) winner = board[2][0];

	// Negative diagonal
	if (board[0][0] == board[1][1] && board[0][0] == board[2][2]) winner = board[0][0];

	let full = true;
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			if (board[y][x] == 0) full = false;
		}
	}

	if (full && winner == Winner.OnGoing) winner = Winner.Tie;
	if (winner == 1) winner = Winner.Player1;
	if (winner == -1) winner = Winner.Player2;
	return winner;
}

function displayWinningPositions(game: Game, board: Board) {
	// Rows
	for (let y = 0; y < 3; y++) {
		if (board[y][0] == board[y][1] && board[y][0] == board[y][2] && board[y][0] != 0) {
			game.buttons[y].components[0].setStyle(ButtonStyle.Success);
			game.buttons[y].components[1].setStyle(ButtonStyle.Success);
			game.buttons[y].components[2].setStyle(ButtonStyle.Success);
		}
	}

	// Columns
	for (let x = 0; x < 3; x++) {
		if (board[0][x] == board[1][x] && board[0][x] == board[2][x] && board[0][x] != 0) {
			game.buttons[0].components[x].setStyle(ButtonStyle.Success);
			game.buttons[1].components[x].setStyle(ButtonStyle.Success);
			game.buttons[2].components[x].setStyle(ButtonStyle.Success);
		}
	}

	// Positive diagonal
	if (board[2][0] == board[1][1] && board[2][0] == board[0][2]) {
		game.buttons[2].components[0].setStyle(ButtonStyle.Success);
		game.buttons[1].components[1].setStyle(ButtonStyle.Success);
		game.buttons[0].components[2].setStyle(ButtonStyle.Success);
	}

	// Negative diagonal
	if (board[0][0] == board[1][1] && board[0][0] == board[2][2]) {
		game.buttons[0].components[0].setStyle(ButtonStyle.Success);
		game.buttons[1].components[1].setStyle(ButtonStyle.Success);
		game.buttons[2].components[2].setStyle(ButtonStyle.Success);
	}
}

// Ends the game after someone wins
function gameEnded(game: Game) {
	displayWinningPositions(game, game.board);

	saveData(game.player1.id, game.winner == Winner.Tie ? 0 : game.winner, game.bot); // Saves p1
	saveData(game.player2.id, game.winner == Winner.Tie ? 0 : -game.winner, false); // Saves p2 (works for PastaBot too!)

	// Disables all buttons
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			game.buttons[y].components[x].setDisabled(true);
		}
	}

	// Displays the winner
	let description;
	if (game.winner == 2) {
		description = 'Tie!';
	} else {
		description =
			game.winner == 1
				? `<@${game.player1.id}> wins! Sorry <@${game.player2.id}>!`
				: `<@${game.player2.id}> wins! Sorry <@${game.player1.id}>!`;
	}

	// Updates the message
	const lastEmbed = game.embed.embeds[0];
	const embed = EmbedBuilder.from(lastEmbed)
		.setDescription(`${description}\nThanks for playing! :grin:`)
		.setFields();

	// Removes the game from memory
	game.interaction.editReply({ embeds: [embed], components: game.buttons });
	games.delete(game.interaction.id);
}

// Ends the game if someone takes too long
function ranOutOfTime(game: Game) {
	saveData(game.player1.id, game.player1Turn ? -1 : 1, game.bot); // Saves p1
	saveData(game.player2.id, game.player1Turn ? 1 : -1, false); // Saves p2 (works for PastaBot too!)

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
	const embed = EmbedBuilder.from(lastEmbed)
		.setDescription(`${description}\nThanks for playing! :grin:`)
		.setFields();

	// Removes the game from memory
	game.interaction.editReply({ embeds: [embed], components: game.buttons });
	games.delete(game.interaction.id);
}

// Saves the new data to the database
// Final: 1 - player, -1 - p2, 0 - tie
async function saveData(userid: string, final: number, bot: boolean) {
	// Finds the user data, creating a new entry if needed
	const data = await tictactoeStatsSchema.findOneAndUpdate(
		{ userID: userid },
		{ $setOnInsert: { userID: userid } },
		{ upsert: true, new: true }
	);

	// Updates the stats of the user
	const newTictactoeStats = await tictactoeStatsSchema.findOneAndUpdate(
		{ userID: userid },
		{
			winsHuman: data.winsHuman + (!bot && final == 1 ? 1 : 0),
			winsBot: data.winsBot + (bot && final == 1 ? 1 : 0),
			wins: data.wins + (final == 1 ? 1 : 0),
			lossesHuman: data.lossesHuman + (!bot && final == -1 ? 1 : 0),
			lossesBot: data.lossesBot + (bot && final == -1 ? 1 : 0),
			totalHuman: data.totalHuman + (!bot ? 1 : 0),
			totalBot: data.totalBot + (bot ? 1 : 0),
			totalGames: data.totalGames + 1
		}
	);

	if (!newTictactoeStats) {
		logger
			.child({ mode: 'REACTION ROLE', metaData: { userid: userid } })
			.error(`Could not update database for user '${userid}'`);
		return;
	}

	database.writeToDatabase(newTictactoeStats, 'UPDATED TICTACTOE STATS');
}

function generateHelpMenu() {
	return newEmbed()
		.setTitle('How to Play Tic-Tac-Toe ❌⭕')
		.setColor(colors.tictactoeCommand)
		.setDescription(
			'__Tic-Tac-Toe__ is a two-player game of Xs and Os. Each player takes turns placing their respective piece on the 3x3 game board. You can challenge your friend to a duel or test your skills against PastaBot himself!'
		)
		.addFields(
			{
				name: 'Winning 😏',
				value: 'The game is won when you get all of your pieces in a row or diaganol of 3. Try to sneakily setup a position where you can get 2 rows at a same time! Your opponent can only block one >:)'
			},
			{
				name: 'Bot 🍝',
				value: 'PastaBot has been practicing his skills just for you, adapting his play depending on how good you are. Be warned, he might get a bit cocky sometimes...'
			}
		);
}

// Sends the different leaderboards to the user depending on the type
async function leaderboards(interaction: ModChatInputCommandInteraction) {
	if (interaction.options.getString('type') == 'played') {
		// Most plays

		// Gets all users who have played at least 1 game
		const users = await tictactoeStatsSchema.find({ totalGames: { $gt: 0 } });

		// Creates the embed
		const mostPlayedEmbed = newEmbed()
			.setTitle('Leaderboard - Most Played')
			.setColor(colors.tictactoeCommand)
			.setDescription(
				leaderboardMulti(
					users,
					false,
					['totalGames', 'totalBot', 'totalHuman'],
					['Total Games', 'Total Bot Games', 'Total Human Games'],
					interaction.user.id
				)
			);
		interaction.editReply({ embeds: [mostPlayedEmbed] });
	} else if (interaction.options.getString('type') == 'wins') {
		// Most wins

		// Gets all users who have won at least 1 game
		const users = await tictactoeStatsSchema.find({ wins: { $gt: 0 } });

		// Creates the embed
		const mostWinsEmbed = newEmbed()
			.setTitle('Leaderboard - Most Wins')
			.setColor(colors.tictactoeCommand)
			.setDescription(
				leaderboardMulti(
					users,
					false,
					['wins', 'winsBot', 'winsHuman'],
					['Total Wins', 'Bot Wins', 'Human Wins'],
					interaction.user.id
				)
			);
		interaction.editReply({ embeds: [mostWinsEmbed] });
	}
}

// Sends the user's stats depending on who they want
async function generateStatsEmbed(interaction: ModChatInputCommandInteraction) {
	// Boolean whether the user is searching for another user
	const otherUser = interaction.options.getUser('user') != null;
	const stats = await tictactoeStatsSchema.findOne({
		userID: otherUser ? interaction.options.getUser('user')?.id : interaction.user.id
	});

	if (stats == null) {
		const warnEmbed = newEmbed()
			.setTitle('No Data')
			.setColor(colors.warn)
			.setDescription("You haven't played any games!");
		interaction.editReply({ embeds: [warnEmbed] });
		return;
	}

	// Formatting is weird to fix mobile formatting issue
	const statsEmbed = newEmbed()
		.setTitle('User Statistics')
		.setColor(colors.tictactoeCommand)
		.setDescription(
			`**User - <@${otherUser ? interaction.options.getUser('user')?.id : interaction.user.id}>**

**Current Standings**:
*(total | bot | human)*
Wins: \`${stats.wins}\` | \`${stats.winsBot}\` | \`${stats.winsHuman}\`
Draws: \`${stats.totalGames - stats.wins - stats.lossesBot - stats.lossesHuman}\` | \`${stats.totalBot - stats.winsBot - stats.lossesBot}\` | \`${stats.totalHuman - stats.winsHuman - stats.lossesHuman}\`
Losses: \`${stats.lossesBot + stats.lossesHuman}\` | \`${stats.lossesBot}\` | \`${stats.lossesHuman}\`\n
**Win Ratio**: \`${stats.totalGames != 0 ? Math.round((stats.wins / stats.totalGames) * 1000) / 10 : 0}%\`
Bot: \`${stats.totalBot != 0 ? Math.round((stats.winsBot / stats.totalBot) * 1000) / 10 : 0}%\`
Human: \`${stats.totalHuman != 0 ? Math.round((stats.winsHuman / stats.totalHuman) * 1000) / 10 : 0}%\``
		);

	interaction.editReply({ embeds: [statsEmbed] });
}

// The discord command bits
module.exports = {
	data: new SlashCommandBuilder()
		.setName('tictactoe')
		.setDescription('A tic-tac-toe minigame')

		// start game
		.addSubcommand((subcommand) =>
			subcommand
				.setName('start')
				.setDescription('Start a game of tictactoe')
				.addUserOption((option) =>
					option.setName('user').setDescription('The user you wish to play against')
				)
		)

		// help
		.addSubcommand((subcommand) =>
			subcommand.setName('help').setDescription('Open a help menu on tic-tac-toe')
		)

		// leaderboards
		.addSubcommand((subcommand) =>
			subcommand
				.setName('leaderboards')
				.setDescription('Showcases the global leaderboards for tic-tac-toe')
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('The type of leaderboard to show')
						.setRequired(true)
						.addChoices(
							{ name: 'most played', value: 'played' },
							{ name: 'most wins', value: 'wins' }
						)
				)
		)

		// user stats
		.addSubcommand((subcommand) =>
			subcommand
				.setName('stats')
				.setDescription('Gets the stats of a user')
				.addUserOption((option) =>
					option.setName('user').setDescription('The user to view the stats of')
				)
		),

	category: 'minigames',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'start':
				createGame(interaction);
				break;
			case 'help':
				interaction.editReply({ embeds: [generateHelpMenu()] });
				break;
			case 'leaderboards':
				await leaderboards(interaction);
				break;
			case 'stats':
				await generateStatsEmbed(interaction);
				break;
		}
	}
} as Command;

// Named exports for unit testing of pure internal functions
// Named exports for unit testing of pure internal functions
module.exports.checkWinner = checkWinner;
module.exports.findBestMove = findBestMove;
module.exports.findRandomMove = findRandomMove;
module.exports.determineMistakeChance = determineMistakeChance;
module.exports.MinimaxAlphaBeta = MinimaxAlphaBeta;
module.exports.Winner = Winner;
