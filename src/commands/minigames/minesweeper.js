const { MessageEmbed, Collection, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const numOfMines = 10;
const size = 8;

const games = new Collection();

const wallColors = ['🟩', '🟧', '🟪', '🟨', '🟫'];
const playerEmojis = ['😎', '😄', '😊', '🤪', '🥴'];

// Creates a new game for a user
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
	game.buttons = [row1, row2];

	// Selects a random player emoji and wall color
	game.player.emoji = playerEmojis[Math.floor(Math.random() * playerEmojis.length)];
	game.player.walls = wallColors[Math.floor(Math.random() * wallColors.length)];

	// Generates the board
	game.board = generateBoard();
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

	// Sends the game to the user and waits for any input
	game.interaction.editReply({ embeds: [minesweeperEmbed], components: [row1, row2] }).then(async embed => {
		game.embed = embed;

		// Waits for user input
		awaitInput(game);
	});

	return;
}

// Helper function to make the buttons
function createButton(ID, emoji, style) {
	return new MessageButton().setCustomId(ID).setEmoji(emoji).setStyle(style);
}

// Listens for the user's input
async function awaitInput(game) {
	game.componentCollector = game.embed.createMessageComponentCollector({ componentType: 'BUTTON', time: game.timeout });

	// Detects and sends the move the player wants
	game.componentCollector.on('collect', (button) => {
		button.deferUpdate();
		if(button.user.id !== game.interaction.user.id) return;
		gameLoop(game, button.customId);
	});

	// When the timer runs out/the interaction or channel is deleted
	game.componentCollector.on('end', () => {
		// Checks if the user has already won the game, if not automatically fail it
		if(!game.player.won) {
			lose(game);
		}
	});
}

// The main game loop to update everything
function gameLoop(game, move) {

	updatePlayer(game, move);
	updateBoard(game, move);

	const text = generateText(game);

	// Lose, win, or update the game information
	if (game.player.lost) {
		// Lose the game
		lose(game);
	} else if (game.tilesLeft == numOfMines) {
		// Win the game
		const lastEmbed = game.embed.embeds[0];
		const embed = new MessageEmbed(lastEmbed).setDescription(text);
		embed.fields = {
			name: 'You Win!',
			value: 'Thanks for playing! :grin:',
			inline: false,
		};

		game.player.won = true;

		game.interaction.editReply({ embeds: [embed], components: [] });
		games.delete(game.interaction.id);
	} else {
		// Updates the game's stats
		const lastEmbed = game.embed.embeds[0];
		const embed = new MessageEmbed(lastEmbed).setDescription(text);
		embed.fields[0] = {
			name: 'Bombs Left',
			value: `${numOfMines - game.flags}`,
			inline: true,
		};

		game.interaction.editReply({ embeds: [embed], components: [game.buttons[0], game.buttons[1]] });
	}
}

// Displays the losing screen and removes the game from memory
async function lose(game) {
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

	// In case the channel/interaction was deleted
	try {
		await game.interaction.editReply({ embeds: [embed], components: [] });
	} catch (error) {
		logger.child({
			mode: 'MINESWEEPER',
			metaData: { user: game.interaction.user.username, userid: game.interaction.user.id, guild: game.interaction.guild.name, guildid: game.interaction.guild.id },
		}).warn(`Minesweeper game by '${game.interaction.user.username}' could not be changed in '${game.interaction.guild.name}'`);
		logger.child({
			mode: 'MINESWEEPER',
			metaData: { user: game.interaction.user.username, userid: game.interaction.user.id, guild: game.interaction.guild.name, guildid: game.interaction.guild.id },
		}).error(error);
	}

	games.delete(game.interaction.id);
}

// Updates the player's position
function updatePlayer(game, move) {
	game.board[game.player.x][game.player.y].status = game.player.tileStatus;
	if(move == 'up') game.player.x--;
	else if(move == 'down') game.player.x++;
	else if(move == 'left') game.player.y--;
	else if(move == 'right') game.player.y++;
}

// Updates the board and controls from the given move
function updateBoard(game, move) {
	// Moves the player and replaces the tile before
	game.player.tileStatus = game.board[game.player.x][game.player.y].status;
	game.board[game.player.x][game.player.y].status = 2;

	// Digging/Flagging a tile
	switch (move) {
	case 'dig':
		floodFill(game, game.player.x, game.player.y);
		game.player.tileStatus = 1;
		break;
	case 'flag':
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

	// Disables the buttons based on the position of the player
	game.buttons[0].components[1].setDisabled(game.player.x <= 1);											// up button
	game.buttons[1].components[1].setDisabled(game.player.x >= game.board.length - 2); 						// down button
	game.buttons[1].components[0].setDisabled(game.player.y <= 1); 											// left button
	game.buttons[1].components[2].setDisabled(game.player.y >= game.board[game.player.x].length - 2); 		// right button

	game.buttons[0].components[0].setDisabled(game.player.tileStatus == 1);									// flag
	game.buttons[0].components[2].setDisabled(game.player.tileStatus == 1 || game.player.tileStatus == 3);	// dig
}

// Converts the board array into discord emojis
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

// "Clicks" on a tile changing its status to 1, recursively clicking if the tile is 0
function floodFill(game, x, y) {
	if (x < 1 || y < 1 || x >= game.board.length - 1 || y >= game.board[x].length - 1 || game.board[x][y].status == 1) return; // Boarder or already shown
	game.board[x][y].status = 1;
	game.tilesLeft--;
	if (game.board[x][y].num == 0) { // Clicks surrounding tiles
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
function generateBoard() {
	const board = [];
	const minePositions = generateMines();

	for (let x = 0; x < size + 2; x++) {
		const row = [];
		for (let y = 0; y < size + 2; y++) {
			// Border
			if (y == 0 || y == size + 1 || x == 0 || x == size + 1) {
				const tile = { status: 4, x, y, mine: false, num: 0 };
				row.push(tile);
			} else {
				// status: 0 = hidden; 1 = shown; 2 = player, 3 = flag, 4 = border, 5 = explode, 6 = x (wrong flag)
				const tile = { status: 0, x, y, mine: minePositions.some(positionMatch.bind(null, { x, y })), num: 0 };
				row.push(tile);
			}
		}
		board.push(row);
	}

	// Precomputes each tile's number
	for (let x = 0; x < size + 2; x++) {
		for (let y = 0; y < size + 2; y++) {
			if (board[x][y].status !== 4) {
				board[x][y].num = calculateTileNum(board, x, y);
			}
		}
	}

	return board;
}

// Checks if a tile contains a bomb
function checkTile(board, x, y) {
	if (x < 1 || y < 1 || x >= board.length - 1 || y >= board[x].length - 1) return 0; // Outside of the board
	return board[x][y].mine ? 1 : 0; // Returns 1 for bomb, 0 for not
}

// Returns the number of bombs surrounding a tile
function calculateTileNum(board, x, y) {
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

// Generates an array of mine positions
function generateMines() {
	const mines = [];
	while (mines.length < numOfMines) {
		const mine = { x: randomNumber() + 1, y: randomNumber() + 1 };
		if (!(mines.some(positionMatch.bind(null, mine)) || (mine.x == 1 && mine.y == 1))) {
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

function generateHelpMenu() {
	return newEmbed()
		.setTitle('How to Play Minesweeper 💣')
		.setColor(colors.minesweeperCommand)
		.setDescription('__Minesweeper__ is a game about avoiding mines and clicking tiles. You begin with a board that is full of *hidden tiles*. Under these tiles are randomly generated mines and it is your job to find them. Here are a few actions to help you in your minesweeper career! ')
		.addFields({
			name: 'Movement 🎮',
			value: 'Movement is as simple as it gets, using the movement buttons below you can guide your character around the board to wherever you see fit. The buttons automatically grey out when an illegal move could be performed.',
		}, {
			name: 'Digging ⛏️',
			value: 'Digging is one of the core features of minesweeper. Clicking the button will dig the tile beneath your character. It may reveal a tile (meaning you\'re safe) or a bomb (losing the game). **The number on the tile revealed indicates how many mines are within a 3x3 area centered on that tile.** If the tile is 0, a regular cleared tile will be placed there instead.\n\n*P.S. the top right tile will never be a mine ;)*',
		}, {
			name: 'Flagging 🚩',
			value: 'Flags are a useful (but not necessary) feature of the game. You can flag spots that you *know for sure* are mines to help aid in completing the game. It also helps not accidentally blowing yourself up as you cannot dig flagged tiles.',
		}, {
			name: 'Winning/Losing 💥',
			value: 'If you are skillful enough, you can clear every single tile except the mines on the entire board. Congratulations! You won!! If you were the unlucky fellow who dug up that mine, you lost :(',
		})
	}

// The discord command bits
module.exports = {
	data: new SlashCommandBuilder()
		.setName('minesweeper')
		.setDescription('A minesweeper minigame')

		// start game
		.addSubcommand(subcommand => subcommand
			.setName('start')
			.setDescription('Start a game of minesweeper'),
		)

		// help
		.addSubcommand(subcommand => subcommand
			.setName('help')
			.setDescription('Open a help menu on minesweeper'),
		)
	category: 'minigames',

	async execute(interaction) {
		await interaction.deferReply();

		switch (interaction.options.getSubcommand()) {
		case 'start':
			createGame(interaction);
			break;
		case 'help':
			interaction.editReply({ embeds: [generateHelpMenu()] });
			break;
	},
};