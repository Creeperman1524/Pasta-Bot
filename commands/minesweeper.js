const Discord = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');

const {
	version,
} = require('../config.json');

// TODO: reaction controls, player movement, win/lose condition, flood-fill, reset game, asychronous, multi-user support, code refactoring

module.exports = {
	data: new SlashCommandBuilder()
		.setName('minesweeper')
		.setDescription('Start a game of minesweeper'),

	async execute(interaction) {
		interaction.reply({
			content: 'This command is currently a WIP!',
			ephemeral: true,
		});


		// // Checks if the player started a game or is asking for help
		// if (args[0] == 'start') {
		// 	startGame(message);
		// } else if (args[0] == 'help') {
		// 	console.log('send help');
		// }
	},
};

// Starts a new game
function startGame(message) {
	const size = 8;
	const numOfMines = 10;

	const board = generateBoard(size, numOfMines);
	const text = generateText(board, size);

	// Creates the board
	const minesweeperEmbed = new Discord.MessageEmbed()
		.setTitle('Minesweeper')
		.setColor(0x232323)
		.setDescription(text)
		.setFooter(`Version ${version}`);

	message.channel.send(minesweeperEmbed);

	// message.channel.send(minesweeperEmbed).then(async embed => {
	// 	// Adds the reactions to the message
	// 	try {
	// 		await embed.react('⬅️');
	// 		await embed.react('➡️');
	// 		await embed.react('⬆️');
	// 		await embed.react('⬇️');
	// 		await embed.react('🔽');
	// 		await embed.react('🔴');
	// 		await embed.react('🔄');
	// 	} catch (error) {
	// 		console.error('One of the emojis failed to react:', error);
	// 	}

	// 	// Filters out other reactions and users
	// 	const filter = (reaction, user) => {
	// 		return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
	// 	};

	// 	// Waits for the user input
	// 	embed.awaitReactions(filter, {
	// 		max: 1,
	// 		time: 60000,
	// 		errors: ['time'],
	// 	})
	// 		.then(collected => {
	// 			const reaction = collected.first();

	// 			if (reaction.emoji.name === '⬅️') {
	// 				embed.reply('you reacted with a thumbs up.');
	// 			} else {
	// 				embed.reply('you reacted with a thumbs down.');
	// 			}
	// 		})
	// 		.catch(() => {
	// 			message.reply('you reacted with neither a thumbs up, nor a thumbs down.');
	// 		});
	// });
	return;
}


// Generates the text for the UI
function generateText(board, size) {
	let text = '';

	console.log(board);

	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			const tile = board[x][y];

			// Displays the mines
			let number = 0;
			switch (tile.status) {
			case 0: // Hidden
				text += ':white_large_square:';
				break;
			case 1: // Shown

				// Checks for mine
				switch (tile.mine) {
				case false: // No mine
					number += checkTile(x - 1, y - 1, board);
					number += checkTile(x, y - 1, board);
					number += checkTile(x + 1, y - 1, board);
					number += checkTile(x - 1, y, board);
					number += checkTile(x + 1, y, board);
					number += checkTile(x - 1, y + 1, board);
					number += checkTile(x, y + 1, board);
					number += checkTile(x + 1, y + 1, board);

					text += getNumber(number);
					break;
				case true: // Is a mine
					text += ':bomb:';
					break;
				}
				break;


			case 2: // Player
				text += ':x:';
				break;
			case 3: // Border
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
		final = ':zero:';
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

// Retreves a tile from a certain location
function checkTile(x, y, board) {
	if (x < 0 || y < 0) return 0; // If the tile is outside of the board, it's 0
	if (x >= board.length) return 0;
	if (y >= board[x].length) return 0;
	if (board[x][y].mine == true) return 1; // If the tile is a bomb, it's 1
	return 0; // Otheriwse it's not
}

// Generates the board
function generateBoard(size, numOfMines) {
	const board = [];
	const minePositions = generateMines(size, numOfMines);

	for (let x = 0; x < size + 2; x++) {
		const row = [];
		for (let y = 0; y < size + 2; y++) {

			// Border
			if (y == 0 || y == size + 1 || x == 0 || x == size + 1) {
				const status = 3;
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
					status, // 0 = hidden; 1 = shown; 2 = flag, 3 = border
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
function generateMines(size, numOfMines) {
	const mines = [];

	while (mines.length < numOfMines) {
		const mine = {
			x: randomNumber(size) + 1,
			y: randomNumber(size) + 1,
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
function randomNumber(size) {
	return Math.floor(Math.random() * size);
}