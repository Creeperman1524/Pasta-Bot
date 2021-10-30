const Discord = require('discord.js');
const {
	version,
} = require('../config.json');

// TODO: first click guaranteed to be safe, auto-timeout, update to v13

const emojiList = ['⬅️', '➡️', '⬆️', '⬇️', '🔽', '🔴'];

const numOfMines = 10;
const size = 8;

const games = new Discord.Collection();

// Creates a game for a user
function createGame(myMessage) {
	// Creates a game object
	const game = {
		board: [],
		flags: 0,
		tilesLeft: size * size,
		player: {
			x: 1,
			y: 1,
			tileStatus: 0,
			lost: false,
		},
		reactionCollector: null,
		message: myMessage, // The user command
		embed: null, // The game/embedS sent
		timeout: new Date(new Date().getTime() + 10 * 60000), // game will expire in ten minutes
	};

	// Adds it to the games object
	games.set(myMessage.id, game);
	startGame(game);
}

// Starts a new game
function startGame(game) {

	game.board = generateBoard(game.board);
	updateBoard(game); // Adds the player
	const text = generateText(game);

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
			value: game.message.author,
			inline: true,
		})
		.setDescription(text)
		.setFooter(`Version ${version}`);

	// Adds the reactions after sending the board
	game.message.channel.send(minesweeperEmbed).then(async embed => {
		game.embed = embed;

		// Adds the reactions to the message
		try {
			for (const emoji of emojiList) await embed.react(emoji);
		} catch (error) {
			console.error('One of the emojis failed to react:', error);
		}

		// Waits for user input
		listenForReactions(game);
	});

	return;
}

// Listens for the user input
async function listenForReactions(game) {
	game.reactionCollector = game.embed.createReactionCollector((reaction, user) => emojiList.includes(reaction.emoji.name) && user == game.message.author);

	let move = '';

	// Detects and sends the move the player wants
	await game.reactionCollector.on('collect', reaction => {
		reaction.users.remove(game.message.author);
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
		default:
			break;
		}
		gameLoop(game, move);
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
		const newEmbed = game.embed.embeds[0].setDescription(text);
		newEmbed.fields = {
			name: 'You Win!',
			value: 'Thanks for playing! :grin:',
			inline: false,
		};

		game.embed.edit(newEmbed);
		game.embed.reactions.removeAll();
		games.delete(game.message.id);

	} else if (game.player.lost) {
		// Lose the game
		lose(game);

	} else {
		// Updates the game's stats
		const newEmbed = game.embed.embeds[0].setDescription(text);
		newEmbed.fields[0] = {
			name: 'Bombs Left',
			value: numOfMines - game.flags,
			inline: true,
		};

		game.embed.edit(newEmbed);
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

	const newEmbed = game.embed.embeds[0].setDescription(text);
	newEmbed.fields = {
		name: 'You Lose!',
		value: 'Try again next time! :pensive:',
		inline: false,
	};

	game.embed.edit(newEmbed);
	game.embed.reactions.removeAll();
	games.delete(game.message.id);
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
				text += ':white_large_square:';
				break;
			case 1: // Shown

				// Checks for mine
				switch (tile.mine) {
				case false: // No mine
					text += getNumber(tile.num);
					break;
				case true: // Is a mine
					text += ':bomb:';
					game.player.lost = true;
					if (tile.x == game.player.x && tile.y == game.player.y) tile.status = 5; // Changes the player tile to a boom
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
			case 5: // Exploded Bomb
				text += ':boom:';
				break;
			case 6: // Incorrect flag
				text += ':x:';
				break;
			}
		}
		text += '\n';
	}

	return text;
}

// Translates integers to discord emojis
function getNumber(number) {
	const numbers = [':blue_square:', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:', ':seven:', ':eight:'];
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
			createGame(message);
		} else if (args[0] == 'help') {
			console.log('send help');
		}
	},
};