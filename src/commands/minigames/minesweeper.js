const { MessageEmbed, Collection, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');

const numOfMines = 10;
const size = 8;

const games = new Collection();

const wallColors = ['🟩', '🟧', '🟪', '🟨', '🟫'];
const playerEmojis = ['😎', '😄', '😊', '🤪', '🥴'];

// Creates a game for a user
function createGame(myInteraction) {
	// Creates a game object
	const game = {
		board: [],
		buttons: [],
		flags: 0,
		tilesLeft: size * size,
		player: {
			emoji: '',
			walls: '',
			x: 1,
			y: 1,
			tileStatus: 0,
			lost: false,
			won: false,
		},
		componentCollector: null,
		interaction: myInteraction, // The user command
		embed: null, // The game/embeds sent
		timeout: 10 * 60000, // The expiration timer for the game
	};

	// Adds it to the games object
	games.set(myInteraction.id, game);
	startGame(game);
}

// Starts a new game
function startGame(game) {

	// Selects a random player emoji and wall color
	game.player.emoji = playerEmojis[Math.floor(Math.random() * playerEmojis.length)];
	game.player.walls = wallColors[Math.floor(Math.random() * wallColors.length)];

	game.board = generateBoard(game.board);
	updateBoard(game); // Adds the player
	const text = generateText(game);

	// Creates the board
	const minesweeperEmbed = newEmbed()
		.setTitle('Minesweeper 💣')
		.setColor(colors.minesweeperCommand)
		.addFields({
			name: 'Bombs Left',
			value: `\`${numOfMines}\``,
			inline: true,
		}, {
			name: 'Current Player',
			value: game.interaction.user.toString(),
			inline: true,
		}, {
			name: 'Game Expires',
			value: `<t:${Math.round((new Date().getTime() + game.timeout) / 1000)}:R>`,
			inline: false,
		})
		.setDescription(text);

	// Creates the user buttons
	const row1 = new MessageActionRow()
		.addComponents(
			createButton('flag', '🚩', 'SUCCESS'), // Flag button
			createButton('up', '⬆️', 'SECONDARY'), // Up button
			createButton('dig', '⛏️', 'DANGER'), // Dig button
		);
	const row2 = new MessageActionRow()
		.addComponents(
			createButton('left', '⬅️', 'SECONDARY'), // Left button
			createButton('down', '⬇️', 'SECONDARY'), // Down button
			createButton('right', '➡️', 'SECONDARY'), // Right button
		);

	// Adds the reactions after sending the board
	game.interaction.editReply({ embeds: [minesweeperEmbed], components: [row1, row2] }).then(async embed => {
		game.embed = embed;
		game.buttons = [row1, row2];

		// Waits for user input
		awaitInput(game);
	});

	return;
}

// Helper function to make the buttons
function createButton(ID, emoji, style) {
	return new MessageButton().setCustomId(ID).setEmoji(emoji).setStyle(style);
}

// Listens for the user input
async function awaitInput(game) {
	game.componentCollector = game.embed.createMessageComponentCollector({ componentType: 'BUTTON', time: game.timeout });

	// Detects and sends the move the player wants
	game.componentCollector.on('collect', (button) => {
		button.deferUpdate();
		if(button.user.id !== game.interaction.user.id) return;
		gameLoop(game, button.customId);
	});

	game.componentCollector.on('end', () => {
		// Checks if the user has already won the game, if not automatically fail it
		if(!game.player.won) {
			lose(game);
		}
	});
}

function gameLoop(game, move) {
	// Updates the player's position
	updatePlayer(game, move);

	// Generates the new board based on the player's position/move
	updateBoard(game, move);

	// Creates the discord text
	const text = generateText(game);

	// Player has won the game
	if (game.tilesLeft == numOfMines) {
		// Win the game
		const lastEmbed = game.embed.embeds[0];
		const embed = new MessageEmbed(lastEmbed).setDescription(text);
		embed.fields = {
			name: 'You Win!',
			value: 'Thanks for playing! :grin:',
			inline: false,
		};

		game.player.won = true;

		game.interaction.editReply({ embeds: [embed] });
		game.embed.reactions.removeAll();
		games.delete(game.interaction.id);

	} else if (game.player.lost) {
		// Lose the game
		lose(game);

	} else {
		// Updates the game's stats
		const lastEmbed = game.embed.embeds[0];
		const embed = new MessageEmbed(lastEmbed).setDescription(text);
		embed.fields[0] = {
			name: 'Bombs Left',
			value: `${numOfMines - game.flags}`,
			inline: true,
		};

		game.interaction.editReply({ embeds: [embed] });
	}
	// Waits for the user's input
}

function lose(game) {
	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			// Avoids the boom and walls
			if (game.board[x][y].status < 3) {
				game.board[x][y].status = 1;
			}

			// Checks flags and marks incorrect ones with an x
			if (game.board[x][y].status == 3) {
				if(!game.board[x][y].mine) {
					game.board[x][y].status = 6;
				}
			}

		}
	}

	const text = generateText(game);

	const lastEmbed = game.embed.embeds[0];
	const embed = new MessageEmbed(lastEmbed).setDescription(text);
	embed.fields = {
		name: 'You Lose!',
		value: 'Try again next time! :pensive:',
		inline: false,
	};

	game.interaction.editReply({ embeds: [embed] });
	game.embed.reactions.removeAll();
	games.delete(game.interaction.id);
}

function updatePlayer(game, move) {
	game.board[game.player.x][game.player.y].status = game.player.tileStatus;
	switch (move) {
	case 'up':
		if (game.player.x <= 1) return;
		game.player.x--;
		break;
	case 'down':
		if (game.player.x >= game.board.length - 2) return;
		game.player.x++;
		break;
	case 'left':
		if (game.player.y <= 1) return;
		game.player.y--;
		break;
	case 'right':
		if (game.player.y >= game.board[game.player.x].length - 2) return;
		game.player.y++;
		break;
	default:
		break;
	}
}

function updateBoard(game, move) {
	// Moves the player and replaces the tile before
	game.player.tileStatus = game.board[game.player.x][game.player.y].status;
	game.board[game.player.x][game.player.y].status = 2;

	// Digging/Flagging a tile
	switch (move) {
	case 'dig':
		// Cannot dig a flag or already shown tile
		if (game.player.tileStatus == 1 || game.player.tileStatus == 3) return;

		floodFill(game, game.player.x, game.player.y);
		game.player.tileStatus = 1;
		break;
	case 'flag':
		// Cannot place a flag on a shown tile
		if (game.player.tileStatus == 1) return;

		if (game.player.tileStatus !== 3) {
			// Not on a flag AND is on a hidden tile
			game.board[game.player.x][game.player.y].status = 3;
			game.player.tileStatus = 3;
			game.flags++;
		} else {
			// On a flag
			game.board[game.player.x][game.player.y].status = 0;
			game.player.tileStatus = 0;
			game.flags--;
		}
		break;
	}
}

// Generates the text for the UI
function generateText(game) {
	let text = '';

	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			const tile = game.board[x][y];

			// Displays the mines
			switch (tile.status) {
			case 0: // Hidden
				text += '⬜';
				break;
			case 1: // Shown

				// Checks for mine
				switch (tile.mine) {
				case false: // No mine
					text += getNumber(tile.num);
					break;
				case true: // Is a mine
					text += '💣';
					game.player.lost = true;
					if (tile.x == game.player.x && tile.y == game.player.y) tile.status = 5; // Changes the player tile to a boom
					break;
				}
				break;

			case 2: // Player
				text += game.player.emoji;
				break;
			case 3: // Flag
				text += '🟥';
				break;
			case 4: // Border
				text += game.player.walls;
				break;
			case 5: // Exploded Bomb
				text += '💥';
				break;
			case 6: // Incorrect flag
				text += '❌';
				break;
			}
		}
		text += '\n';
	}
	return text;
}

// Translates integers to discord emojis
function getNumber(number) {
	const numbers = ['🟦', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
	return numbers[number];
}

// Changes the status of a tile, flood-fills if zero
function floodFill(game, x, y) {
	if (x < 1 || y < 1 || x >= game.board.length - 1 || y >= game.board[x].length - 1 || game.board[x][y].status == 1) return;
	game.board[x][y].status = 1;
	game.tilesLeft--;
	if (game.board[x][y].num == 0) {
		floodFill(game, x - 1, y - 1);
		floodFill(game, x, y - 1);
		floodFill(game, x + 1, y - 1);
		floodFill(game, x - 1, y);
		floodFill(game, x + 1, y);
		floodFill(game, x - 1, y + 1);
		floodFill(game, x, y + 1);
		floodFill(game, x + 1, y + 1);
	}
}

// Generates the board
function generateBoard(board) {
	const minePositions = generateMines();

	for (let x = 0; x < size + 2; x++) {
		const row = [];
		for (let y = 0; y < size + 2; y++) {

			// Border
			if (y == 0 || y == size + 1 || x == 0 || x == size + 1) {
				const tile = {
					status: 4,
					x,
					y,
					mine: false,
					num: 0,
				};
				row.push(tile);
			} else {
				const tile = {
					status: 0, // 0 = hidden; 1 = shown; 2 = player, 3 = flag, 4 = border, 5 = explode, 6 = x (wrong flag)
					x,
					y,
					mine: minePositions.some(positionMatch.bind(null, {
						x,
						y,
					})),
					num: 0,
				};
				row.push(tile);
			}
		}
		board.push(row);
	}

	// Calculates the numbers for each of the tiles
	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			if (board[x][y].status !== 4) {
				board[x][y].num = revealTile(board, x, y);
			}
		}
	}

	return board;
}

// Retreves a tile from a certain location, 0 for no bomb, 1 for a bomb
function checkTile(board, x, y) {
	if (x < 1 || y < 1) return 0; // If the tile is outside of the board, it's 0
	if (x >= board.length - 1) return 0;
	if (y >= board[x].length - 1) return 0;
	if (board[x][y].mine == true) return 1; // If the tile is a bomb, it's 1
	return 0; // Otheriwse it's not
}

// Returns the number emoji for the amount of bombs around a tile
function revealTile(board, x, y) {
	let number = 0;
	number += checkTile(board, x - 1, y - 1);
	number += checkTile(board, x, y - 1);
	number += checkTile(board, x + 1, y - 1);
	number += checkTile(board, x - 1, y);
	number += checkTile(board, x + 1, y);
	number += checkTile(board, x - 1, y + 1);
	number += checkTile(board, x, y + 1);
	number += checkTile(board, x + 1, y + 1);

	return number;
}

// Generates the positions of the mines
function generateMines() {
	const mines = [];

	while (mines.length < numOfMines) {
		const mine = {
			x: randomNumber() + 1,
			y: randomNumber() + 1,
		};
		if (!mines.some(positionMatch.bind(null, mine))) {
			mines.push(mine);
		}
	}

	return mines;
}

// Checks if the positions of two mines matches
function positionMatch(a, b) {
	return a.x === b.x && a.y === b.y;
}

// Generates a random integer according to the board size
function randomNumber() {
	return Math.floor(Math.random() * size);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('minesweeper')
		.setDescription('Start a game of minesweeper'),
	category: 'minigames',

	async execute(interaction) {
		await interaction.deferReply();
		createGame(interaction);
	},
};