const Discord = require('discord.js');
const {
	version,
} = require('../config.json');

// TODO: win/lose condition, reset game, multi-user support, code refactoring

const emojiList = ['⬅️', '➡️', '⬆️', '⬇️', '🔽', '🔴', '🔄'];
const player = {
	x: 1,
	y: 1,
	tileStatus: 0,
};

const numOfMines = 10;
const size = 8;

// By invividual user
let board = [];
let flags = 0;

// Starts a new game
function startGame(message) {
	// Reset the player
	player.x = 1;
	player.y = 1;
	player.tileStatus = 0;

	board = generateBoard();
	board = updateBoard(board); // Adds the player
	const text = generateText();

	// Creates the board
	const minesweeperEmbed = new Discord.MessageEmbed()
		.setTitle('Minesweeper')
		.setColor(0x232323)
		.addFields({
			name: 'Bombs Left',
			value: numOfMines,
			inline: true,
		}, {
			name: 'Current Player',
			value: message.author,
			inline: true,
		})
		.setDescription(text)
		.setFooter(`Version ${version}`);

	// Adds the reactions after sending the board
	message.channel.send(minesweeperEmbed).then(async embed => {
		// Adds the reactions to the message
		try {
			for (const emoji of emojiList) await embed.react(emoji);
		} catch (error) {
			console.error('One of the emojis failed to react:', error);
		}

		// Waits for user input
		listenForReactions(embed, message);
	});

	return;
}

// Listens for the user input
async function listenForReactions(embed, message) {
	const reactionCollector = embed.createReactionCollector((reaction, user) => emojiList.includes(reaction.emoji.name) && user == message.author);

	let move = '';

	// Detects and sends the move the player wants
	await reactionCollector.on('collect', reaction => {
		reaction.users.remove(message.author);
		switch (reaction.emoji.name) {
		case emojiList[0]:
			move = 'left';
			break;
		case emojiList[1]:
			move = 'right';
			break;
		case emojiList[2]:
			move = 'up';
			break;
		case emojiList[3]:
			move = 'down';
			break;
		case emojiList[4]:
			move = 'dig';
			break;
		case emojiList[5]:
			move = 'flag';
			break;
		case emojiList[6]:
			move = 'reset';
			break;
		default:
			break;
		}
		gameLoop(embed, move, message);
	});
}

function gameLoop(embed, move) {
	// Updates the player's position
	updatePlayer(move);

	// Generates the new board based on the player's position/move
	board = updateBoard(move);

	// Creates the discord text
	const text = generateText();

	// Edits the previous message
	const newEmbed = embed.embeds[0].setDescription(text);
	newEmbed.fields[0] = {
		name: 'Bombs Left',
		value: numOfMines - flags,
	};
	embed.edit(newEmbed);

	// Waits for the user's input
}

function updatePlayer(move) {
	board[player.x][player.y].status = player.tileStatus;
	switch (move) {
	case 'up':
		if (player.x < 1) break;
		player.x--;
		break;
	case 'down':
		if (player.x > board.length - 1) break;
		player.x++;
		break;
	case 'left':
		if (player.y < 1) break;
		player.y--;
		break;
	case 'right':
		if (player.y > board[player.x].length - 1) break;
		player.y++;
		break;
	default:
		break;
	}
}

function updateBoard(move) {
	// Moves the player and replaces the tile before
	player.tileStatus = board[player.x][player.y].status;
	board[player.x][player.y].status = 2;

	// Digging/Flagging a tile
	switch (move) {
	case 'dig':
		if (board[player.x][player.y].status == 1) return board;
		floodFill(player.x, player.y);
		player.tileStatus = 1;
		break;
	case 'flag':
		board[player.x][player.y].status = 3;
		player.tileStatus = 3;
		flags++;
		break;
	}

	return board;
}

// Generates the text for the UI
function generateText() {
	let text = '';

	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			const tile = board[x][y];

			// Displays the mines
			switch (tile.status) {
			case 0: // Hidden
				text += ':white_large_square:';
				break;
			case 1: // Shown

				// Checks for mine
				switch (tile.mine) {
				case false: // No mine
					text += getNumber(revealTile(x, y));
					break;
				case true: // Is a mine
					text += ':bomb:';
					break;
				}
				break;

			case 2: // Player
				text += ':sunglasses:';
				break;
			case 3: // Flag
				text += ':red_square:';
				break;
			case 4: // Border
				text += ':green_square:';
				break;
			}
		}
		text += '\n';
	}

	return text;
}

// Translates integers to discord emojis
function getNumber(number) {
	let final = '';
	switch (number) {
	case 0:
		final = ':blue_square:';
		break;
	case 1:
		final = ':one:';
		break;
	case 2:
		final = ':two:';
		break;
	case 3:
		final = ':three:';
		break;
	case 4:
		final = ':four:';
		break;
	case 5:
		final = ':five:';
		break;
	case 6:
		final = ':six:';
		break;
	case 7:
		final = ':seven:';
		break;
	case 8:
		final = ':eight:';
		break;
	}

	return final;
}

// Retreves a tile from a certain location, 0 for no bomb, 1 for a bomb
function checkTile(x, y) {
	if (x < 1 || y < 1) return 0; // If the tile is outside of the board, it's 0
	if (x >= board.length - 1) return 0;
	if (y >= board[x].length - 1) return 0;
	if (board[x][y].mine == true) return 1; // If the tile is a bomb, it's 1
	return 0; // Otheriwse it's not
}

// Returns the number emoji for the amount of bombs around a tile
function revealTile(x, y) {
	let number = 0;
	number += checkTile(x - 1, y - 1);
	number += checkTile(x, y - 1);
	number += checkTile(x + 1, y - 1);
	number += checkTile(x - 1, y);
	number += checkTile(x + 1, y);
	number += checkTile(x - 1, y + 1);
	number += checkTile(x, y + 1);
	number += checkTile(x + 1, y + 1);

	return number;
}

// Changes the status of a tile, flood-fills if zero
function floodFill(x, y) {
	if (x < 1 || y < 1 || x >= board.length - 1 || y >= board[x].length - 1 || board[x][y].status == 1) return;
	board[x][y].status = 1;
	if (revealTile(x, y) == 0) {
		floodFill(x - 1, y - 1);
		floodFill(x, y - 1);
		floodFill(x + 1, y - 1);
		floodFill(x - 1, y);
		floodFill(x + 1, y);
		floodFill(x - 1, y + 1);
		floodFill(x, y + 1);
		floodFill(x + 1, y + 1);
	}
}

// Generates the board
function generateBoard() {
	board = [];
	const minePositions = generateMines();

	for (let x = 0; x < size + 2; x++) {
		const row = [];
		for (let y = 0; y < size + 2; y++) {

			// Border
			if (y == 0 || y == size + 1 || x == 0 || x == size + 1) {
				const status = 4;
				const tile = {
					status,
					x,
					y,
					mine: false,
				};
				row.push(tile);
			} else {
				const status = 0;
				const tile = {
					status, // 0 = hidden; 1 = shown; 2 = player, 3 = flag, 4 = border
					x,
					y,
					mine: minePositions.some(positionMatch.bind(null, {
						x,
						y,
					})),
				};
				row.push(tile);
			}
		}
		board.push(row);
	}

	return board;
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
	name: 'minesweeper',
	description: 'Start a game of minesweeper',
	aliases: ['ms', 'badapple'],
	args: false,
	usage: '<start|help>',
	guildOnly: false,
	cooldown: 0,
	execute(message, args) {
		// Checks if the player started a game or is asking for help
		if (args[0] == 'start') {
			startGame(message);
		} else if (args[0] == 'help') {
			console.log('send help');
		}
	},
};