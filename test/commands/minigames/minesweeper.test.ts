jest.mock('../../../src/logging', () => ({
	logger: {
		child: jest.fn().mockReturnValue({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		})
	}
}));

const mockMinesweeperStats = {
	findOne: jest.fn(),
	find: jest.fn(),
	findOneAndUpdate: jest.fn(),
	create: jest.fn()
};
jest.mock('../../../src/schemas/minesweeperStats.schema', () => ({
	__esModule: true,
	default: mockMinesweeperStats
}));

jest.mock('../../../src/util/database', () => ({
	__esModule: true,
	default: { writeToDatabase: jest.fn() }
}));

// leaderboard util returns empty string for empty data which crashes Discord.js setDescription —
// mock it to return a safe non-empty string
jest.mock('../../../src/util/leaderboard', () => ({
	leaderboard: jest.fn().mockReturnValue('1 - <@user> : `0`'),
	leaderboardMulti: jest.fn().mockReturnValue('1 - <@user> : `0`')
}));

import minesweeper, { testingFuncs } from '../../../src/commands/minigames/minesweeper';
const {
	generateBoard,
	generateMines,
	calculateTileNum,
	checkTile,
	positionMatch,
	randomNumber,
	getNumber,
	floodFill,
	updateBoard,
	updatePlayer,
	generateText,
	gameLoop
} = testingFuncs;

import { createMockInteraction } from '../../helpers/mockInteraction';
import { createMockMessage } from '../../helpers/mockMessage';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

// Board constants from minesweeper.ts
const NUM_OF_MINES = 10;
const BOARD_SIZE = 8; // inner size; full board is (SIZE+2) x (SIZE+2) with border padding

// Tile structure from the source file
type Tile = { status: number; x: number; y: number; mine: boolean; num: number };
type Board = Tile[][];

// Helper to build a minimal (4x4) padded board for calculateTileNum tests
function makeSmallBoard(mineTiles: [number, number][]): Board {
	const SIZE = 4;
	return Array.from({ length: SIZE }, (_, x) =>
		Array.from({ length: SIZE }, (_, y) => ({
			status: x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 4 : 0,
			x,
			y,
			mine: mineTiles.some(([mx, my]) => mx === x && my === y),
			num: 0
		}))
	);
}

/** Builds the two ActionRow button rows that a minesweeper game uses. */
function makeGameButtons(): [ActionRowBuilder<ButtonBuilder>, ActionRowBuilder<ButtonBuilder>] {
	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('flag').setEmoji('🚩').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId('up').setEmoji('⬆️').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('dig').setEmoji('⛏️').setStyle(ButtonStyle.Danger)
	);
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('down').setEmoji('⬇️').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Secondary)
	);
	return [row1, row2];
}

/** Waits for all pending microtasks/promise chains to settle. */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('game logic', () => {
	describe('randomNumber()', () => {
		it('always returns a value in [0, BOARD_SIZE-1]', () => {
			for (let i = 0; i < 50; i++) {
				const n = randomNumber();
				expect(n).toBeGreaterThanOrEqual(0);
				expect(n).toBeLessThan(BOARD_SIZE);
			}
		});
	});

	describe('positionMatch()', () => {
		it('returns true for identical positions', () => {
			expect(positionMatch({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(true);
		});

		it('returns false when x differs', () => {
			expect(positionMatch({ x: 1, y: 4 }, { x: 3, y: 4 })).toBe(false);
		});

		it('returns false when y differs', () => {
			expect(positionMatch({ x: 3, y: 4 }, { x: 3, y: 5 })).toBe(false);
		});
	});

	describe('generateMines()', () => {
		it('returns exactly numOfMines mines', () => {
			expect(generateMines()).toHaveLength(NUM_OF_MINES);
		});

		it('produces no duplicate positions', () => {
			const mines = generateMines();
			for (let i = 0; i < mines.length; i++) {
				for (let j = i + 1; j < mines.length; j++) {
					expect(positionMatch(mines[i], mines[j])).toBe(false);
				}
			}
		});

		it('never places a mine at the starting position (1,1)', () => {
			// Run multiple times since mine placement is random
			for (let run = 0; run < 10; run++) {
				const mines = generateMines();
				const atStart = mines.some((m: { x: number; y: number }) => m.x === 1 && m.y === 1);
				expect(atStart).toBe(false);
			}
		});
	});

	describe('generateBoard()', () => {
		let board: Board;

		beforeEach(() => {
			board = generateBoard();
		});

		it('has correct outer dimensions (BOARD_SIZE+2 with border padding)', () => {
			expect(board.length).toBe(BOARD_SIZE + 2);
			expect(board[0].length).toBe(BOARD_SIZE + 2);
		});

		it('border tiles have status 4 (impassable)', () => {
			board[0].forEach((tile: Tile) => expect(tile.status).toBe(4));
			board[BOARD_SIZE + 1].forEach((tile: Tile) => expect(tile.status).toBe(4));
			board.forEach((row: Tile[]) => {
				expect(row[0].status).toBe(4);
				expect(row[BOARD_SIZE + 1].status).toBe(4);
			});
		});

		it('inner tiles start with status 0 (hidden)', () => {
			for (let x = 1; x <= BOARD_SIZE; x++) {
				for (let y = 1; y <= BOARD_SIZE; y++) {
					expect(board[x][y].status).toBe(0);
				}
			}
		});

		it('contains exactly numOfMines mines across inner tiles', () => {
			let count = 0;
			for (let x = 1; x <= BOARD_SIZE; x++) {
				for (let y = 1; y <= BOARD_SIZE; y++) {
					if (board[x][y].mine) count++;
				}
			}
			expect(count).toBe(NUM_OF_MINES);
		});

		it('inner tiles have their mine count precomputed', () => {
			// Checks to see whether any tile has a different number than 0
			let count = 0;
			for (let x = 1; x <= BOARD_SIZE; x++) {
				for (let y = 1; y <= BOARD_SIZE; y++) {
					count += board[x][y].num;
				}
			}
			expect(count).not.toBe(0);
		});
	});

	describe('checkTile()', () => {
		let board: Board;

		beforeEach(() => {
			board = generateBoard();
		});

		it('returns 0 for border tiles (out-of-bounds)', () => {
			// Row/column 0 are the padded border with status 4 — checkTile should return 0 for those
			expect(checkTile(board, 0, 1)).toBe(0);
			expect(checkTile(board, 1, 0)).toBe(0);
		});

		it('returns 1 for a mine tile and 0 for an empty tile', () => {
			// Find a known mine and a known non-mine from the generated board
			let mineX = -1,
				mineY = -1,
				emptyX = -1,
				emptyY = -1;
			for (let x = 1; x <= BOARD_SIZE && (mineX === -1 || emptyX === -1); x++) {
				for (let y = 1; y <= BOARD_SIZE && (mineX === -1 || emptyX === -1); y++) {
					if (board[x][y].mine && mineX === -1) {
						mineX = x;
						mineY = y;
					}
					if (!board[x][y].mine && emptyX === -1) {
						emptyX = x;
						emptyY = y;
					}
				}
			}
			expect(checkTile(board, mineX, mineY)).toBe(1);
			expect(checkTile(board, emptyX, emptyY)).toBe(0);
		});
	});

	describe('calculateTileNum()', () => {
		it('returns 0 for a tile surrounded by no mines', () => {
			const board = makeSmallBoard([]);
			expect(calculateTileNum(board, 1, 1)).toBe(0);
		});

		it('counts a single adjacent mine correctly', () => {
			// Mine at (1,2) is directly adjacent to tile (1,1)
			const board = makeSmallBoard([[1, 2]]);
			expect(calculateTileNum(board, 1, 1)).toBe(1);
		});

		it('counts two adjacent mines correctly', () => {
			// Mines at (1,2) and (2,1), both adjacent to (1,1)
			const board = makeSmallBoard([
				[1, 2],
				[2, 1]
			]);
			expect(calculateTileNum(board, 1, 1)).toBe(2);
		});
	});

	describe('getNumber()', () => {
		// Each number 0–8 maps to a specific emoji
		const expectedEmojis = ['🟦', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

		it.each(expectedEmojis.map((emoji, i) => [i, emoji] as [number, string]))(
			'maps number %i to emoji %s',
			(num, emoji) => {
				expect(getNumber(num)).toBe(emoji);
			}
		);
	});

	describe('generateText()', () => {
		/** Build a minimal game-like object for generateText() testing. */
		function makeTextGame(
			overrides: Partial<{ status: number; mine: boolean; num: number }> = {}
		) {
			const board = generateBoard();
			// Pick an inner tile to override — use (2, 2) to be away from player start
			board[2][2] = { ...board[2][2], ...overrides };
			const game = {
				board,
				player: {
					emoji: '😎',
					walls: '🟩',
					x: 1,
					y: 1,
					tileStatus: 0,
					lost: false,
					won: false
				},
				buttons: makeGameButtons(),
				flags: 0,
				tilesLeft: BOARD_SIZE * BOARD_SIZE,
				startTime: 0,
				componentCollector: null,
				interaction: {} as never,
				embed: {} as never,
				timeout: 0
			};
			return { game, board };
		}

		it('hidden tile (status 0) renders ⬜', () => {
			const { game } = makeTextGame({ status: 0 });
			const text = generateText(game);
			expect(text).toContain('⬜');
		});

		it('player tile (status 2) renders the player emoji', () => {
			const { game } = makeTextGame();
			// Player starts at (1,1) with status 2 after board init
			game.board[1][1].status = 2;
			const text = generateText(game);
			expect(text).toContain(game.player.emoji);
		});

		it('flag tile (status 3) renders 🟥', () => {
			const { game } = makeTextGame({ status: 3 });
			game.board[2][2].status = 3;
			const text = generateText(game);
			expect(text).toContain('🟥');
		});

		it('border tile (status 4) renders the wall color', () => {
			const { game } = makeTextGame();
			const text = generateText(game);
			expect(text).toContain(game.player.walls);
		});

		it('exploded tile (status 5) renders 💥', () => {
			const { game } = makeTextGame();
			game.board[2][2].status = 5;
			const text = generateText(game);
			expect(text).toContain('💥');
		});

		it('incorrect flag tile (status 6) renders ❌', () => {
			const { game } = makeTextGame();
			game.board[2][2].status = 6;
			const text = generateText(game);
			expect(text).toContain('❌');
		});

		it('shown mine tile (status 1, mine true) renders 💣 and sets player.lost', () => {
			const { game } = makeTextGame({ status: 1, mine: true });
			game.board[2][2].status = 1;
			game.board[2][2].mine = true;
			const text = generateText(game);
			expect(text).toContain('💣');
			expect(game.player.lost).toBe(true);
		});

		it('shown empty tile (status 1, mine false) renders the adjacency number emoji', () => {
			const { game } = makeTextGame({ status: 1, mine: false, num: 3 });
			game.board[2][2].status = 1;
			game.board[2][2].mine = false;
			game.board[2][2].num = 3;
			const text = generateText(game);
			expect(text).toContain('3️⃣');
		});
	});

	describe('floodFill()', () => {
		function makeFloodGame() {
			const board = generateBoard();
			return {
				board,
				player: {
					emoji: '😎',
					walls: '🟩',
					x: 1,
					y: 1,
					tileStatus: 0,
					lost: false,
					won: false
				},
				buttons: makeGameButtons(),
				flags: 0,
				tilesLeft: BOARD_SIZE * BOARD_SIZE,
				startTime: 0,
				componentCollector: null,
				interaction: {} as never,
				embed: {} as never,
				timeout: 0
			};
		}

		it('reveals a single tile and decrements tilesLeft when num > 0', () => {
			const game = makeFloodGame();
			// Find an inner non-mine tile with num > 0 to ensure no propagation
			let tx = -1,
				ty = -1;
			for (let x = 1; x <= BOARD_SIZE && tx === -1; x++) {
				for (let y = 1; y <= BOARD_SIZE && tx === -1; y++) {
					if (!game.board[x][y].mine && game.board[x][y].num > 0) {
						tx = x;
						ty = y;
					}
				}
			}
			const before = game.tilesLeft;
			floodFill(game, tx, ty);
			expect(game.board[tx][ty].status).toBe(1);
			expect(game.tilesLeft).toBe(before - 1);
		});

		it('does not re-reveal an already-shown tile', () => {
			const game = makeFloodGame();
			game.board[3][3].status = 1;
			game.board[3][3].mine = false;
			game.board[3][3].num = 1;
			const before = game.tilesLeft;
			floodFill(game, 3, 3);
			// tilesLeft must not change — tile was already shown
			expect(game.tilesLeft).toBe(before);
		});

		it('returns without revealing a border tile (x=0)', () => {
			const game = makeFloodGame();
			const before = game.tilesLeft;
			floodFill(game, 0, 1); // border row
			expect(game.tilesLeft).toBe(before);
		});

		it('propagates through connected zero-num tiles', () => {
			const game = makeFloodGame();
			// Force a zero-num tile at (3,3) and its neighbour (3,4) with no mines around them
			game.board[3][3].mine = false;
			game.board[3][3].num = 0;
			game.board[3][3].status = 0;
			game.board[3][4].mine = false;
			game.board[3][4].status = 0;
			// After floodFill at (3,3), (3,4) should also be revealed
			floodFill(game, 3, 3);
			expect(game.board[3][3].status).toBe(1);
			expect(game.board[3][4].status).toBe(1);
		});
	});

	describe('updateBoard() / updatePlayer()', () => {
		function makeUpdateGame() {
			const board = generateBoard();
			// Place the player at (1,1) (start) — force status 2
			board[1][1].status = 2;
			return {
				board,
				player: {
					emoji: '😎',
					walls: '🟩',
					x: 1,
					y: 1,
					tileStatus: 0, // tile under player was hidden
					lost: false,
					won: false
				},
				buttons: makeGameButtons(),
				flags: 0,
				tilesLeft: BOARD_SIZE * BOARD_SIZE,
				startTime: 0,
				componentCollector: null,
				interaction: {} as never,
				embed: {} as never,
				timeout: 0
			};
		}

		describe('disabled buttons', () => {
			it('up button is disabled when player is at top row (x=1)', () => {
				const game = makeUpdateGame(); // player at (1,1)
				updateBoard(game, 'right' as never);
				// x is still 1 → up disabled
				expect(game.buttons[0].components[1].data.disabled).toBe(true);
			});

			it('left button is disabled when player is at leftmost column (y=1)', () => {
				const game = makeUpdateGame(); // player at (1,1)
				updateBoard(game, 'up' as never);
				expect(game.buttons[1].components[0].data.disabled).toBe(true);
			});

			it('down button is disabled when player is at bottom row (x=BOARD_SIZE)', () => {
				const game = makeUpdateGame();
				game.player.x = BOARD_SIZE;
				game.player.y = 3;
				game.board[BOARD_SIZE][3].status = 2;
				updateBoard(game, 'right' as never);
				expect(game.buttons[1].components[1].data.disabled).toBe(true);
			});

			it('right button is disabled when player is at rightmost column (y=BOARD_SIZE)', () => {
				const game = makeUpdateGame();
				game.player.x = 3;
				game.player.y = BOARD_SIZE;
				game.board[3][BOARD_SIZE].status = 2;
				updateBoard(game, 'up' as never);
				expect(game.buttons[1].components[2].data.disabled).toBe(true);
			});

			it('flag button is disabled when player is on a shown tile', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 1; // shown
				game.player.tileStatus = 1;
				updateBoard(game, 'right' as never);
				expect(game.buttons[0].components[0].data.disabled).toBe(true);
			});

			it('dig button is disabled when standing on a shown tile', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 1; // shown
				game.player.tileStatus = 1;
				updateBoard(game, 'right' as never);
				expect(game.buttons[0].components[2].data.disabled).toBe(true);
			});

			it('dig button is disabled when standing on a flag', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 3; // flag
				game.player.tileStatus = 3;
				updateBoard(game, 'right' as never);
				expect(game.buttons[0].components[2].data.disabled).toBe(true);
			});
		});

		describe('flagging', () => {
			it('flagging a hidden tile sets it to flag status and increments game.flags', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 0; // hidden
				game.player.tileStatus = 0;
				updateBoard(game, 'flag' as never);
				expect(game.board[1][1].status).toBe(3); // flag
				expect(game.flags).toBe(1);
			});

			it('flagging a flagged tile removes the flag and decrements game.flags', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 3; // flag
				game.player.tileStatus = 3;
				game.flags = 1;
				updateBoard(game, 'flag' as never);
				expect(game.board[1][1].status).toBe(0); // back to hidden
				expect(game.flags).toBe(0);
			});
		});

		describe('digging', () => {
			it('digging a tile reveals it', () => {
				const game = makeUpdateGame();
				game.board[1][1].status = 0; // hidden
				game.board[1][1].num = 1; // force it to not be 0 to prevent floodFill()
				expect(game.tilesLeft).toBe(BOARD_SIZE * BOARD_SIZE);
				updateBoard(game, 'dig' as never);

				expect(game.tilesLeft).toBe(BOARD_SIZE * BOARD_SIZE - 1);
				expect(game.board[1][1].status).toBe(1); // shown
			});
		});

		describe('movement', () => {
			// Normal movement
			it('updatePlayer moves the player right when not at the right border', () => {
				const game = makeUpdateGame(); // player at (1,1)
				game.board[1][1].status = 2;
				updatePlayer(game, 'right' as never);
				expect(game.player.y).toBe(2);
			});

			it('updatePlayer moves the player down when not at the bottom border', () => {
				const game = makeUpdateGame();
				updatePlayer(game, 'down' as never);
				expect(game.player.x).toBe(2);
			});

			it('updatePlayer moves the player up when not at the top border', () => {
				const game = makeUpdateGame();
				game.player.x = BOARD_SIZE;
				game.player.y = BOARD_SIZE;
				updatePlayer(game, 'up' as never);
				expect(game.player.x).toBe(BOARD_SIZE - 1);
			});

			it('updatePlayer moves the player left when not at the left border', () => {
				const game = makeUpdateGame();
				game.player.x = BOARD_SIZE;
				game.player.y = BOARD_SIZE;
				updatePlayer(game, 'left' as never);
				expect(game.player.y).toBe(BOARD_SIZE - 1);
			});

			it('updatePlayer replaces the player tile with the original tile when moving', () => {
				const game = makeUpdateGame();
				updateBoard(game, '' as never); // add the player to the board
				expect(game.board[1][2].status).toBe(0); // hidden tile

				updatePlayer(game, 'right' as never);
				updateBoard(game, '' as never);
				expect(game.board[1][2].status).toBe(2); // player tile
				expect(game.player.tileStatus).toBe(0); // player remembers the hidden tile

				updatePlayer(game, 'right' as never);
				updateBoard(game, '' as never);
				expect(game.board[1][2].status).toBe(0); // back to hidden tile
			});

			// These should already be prevented by disabling the buttons, but it's still good to have due to API spikes
			it('updatePlayer does not move up when already at top border', () => {
				const game = makeUpdateGame(); // x=1
				updatePlayer(game, 'up' as never);
				expect(game.player.x).toBe(1); // unchanged
			});

			it('updatePlayer does not move left when already at left border', () => {
				const game = makeUpdateGame();
				updatePlayer(game, 'left' as never);
				expect(game.player.y).toBe(1); // unchanged
			});

			it('updatePlayer does not move down when already at bottom border', () => {
				const game = makeUpdateGame();
				game.player.x = BOARD_SIZE;
				game.player.y = BOARD_SIZE;
				updatePlayer(game, 'down' as never);
				expect(game.player.x).toBe(BOARD_SIZE); // unchanged
			});

			it('updatePlayer does not move right when already at right border', () => {
				const game = makeUpdateGame();
				game.player.x = BOARD_SIZE;
				game.player.y = BOARD_SIZE;
				updatePlayer(game, 'right' as never);
				expect(game.player.y).toBe(BOARD_SIZE); // unchanged
			});
		});
	});
});

// ---------------------------------------------------------------------------

describe('/minesweeper', () => {
	describe('help', () => {
		it('calls editReply with a help embed', async () => {
			const interaction = createMockInteraction({ subcommand: 'help' });
			await minesweeper.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ embeds: expect.any(Array) })
			);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toContain('How to Play');
		});
	});

	describe('leaderboards', () => {
		beforeEach(() => {
			// Return empty arrays so leaderboard util receives no data (it's mocked anyway)
			mockMinesweeperStats.find.mockResolvedValue([]);
		});

		it.each(['fastest', 'played', 'wins'])(
			'calls editReply with a leaderboard embed for type "%s"',
			async (type) => {
				const interaction = createMockInteraction({
					subcommand: 'leaderboards',
					getString: { type }
				});
				await minesweeper.execute(interaction);
				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({ embeds: expect.any(Array) })
				);
				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
				expect(embed?.toJSON().title).toContain('Leaderboard');
			}
		);
	});

	describe('stats', () => {
		it('replies with "No Data" embed when user is not in the database', async () => {
			mockMinesweeperStats.findOne.mockResolvedValue(null);
			const interaction = createMockInteraction({ subcommand: 'stats' });
			await minesweeper.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toContain('No Data');
		});

		it('replies with User Statistics embed when the user has recorded data', async () => {
			mockMinesweeperStats.findOne.mockResolvedValue({
				wins: 5,
				totalGames: 10,
				fastestTime: '1:23',
				userID: 'user-123'
			});
			const interaction = createMockInteraction({ subcommand: 'stats' });
			await minesweeper.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toContain('User Statistics');

			// Wins and total games should appear in the embed description
			expect(embed?.toJSON().description).toContain('5');
			expect(embed?.toJSON().description).toContain('10');
		});
	});

	describe('start', () => {
		describe('integration', () => {
			beforeEach(() => {
				// Return valid DB document for saveData calls during win/lose
				mockMinesweeperStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					totalGames: 0,
					fastestTime: 9999,
					userID: 'user-123'
				});
			});

			it('sends the initial board embed with movement buttons', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await minesweeper.execute(interaction);
				await flushPromises();

				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({
						embeds: expect.any(Array),
						components: expect.any(Array)
					})
				);
				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
				expect(embed?.toJSON().title).toBe('Minesweeper 💣');
				// Board description must be non-empty
				expect(embed?.toJSON().description?.length).toBeGreaterThan(0);
			});

			it('updates the board when a direction button is pressed', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await minesweeper.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;

				const callsBefore = (interaction.editReply as jest.Mock).mock.calls.length;
				collector.emit('collect', {
					user: { id: 'user-123' },
					customId: 'right',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				expect((interaction.editReply as jest.Mock).mock.calls.length).toBeGreaterThan(
					callsBefore
				);
			});

			it('ignores button presses from users who are not the game owner', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await minesweeper.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;

				const callsBefore = (interaction.editReply as jest.Mock).mock.calls.length;
				collector.emit('collect', {
					user: { id: 'some-other-user' },
					customId: 'right',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				// No additional editReply for the wrong user
				expect((interaction.editReply as jest.Mock).mock.calls.length).toBe(callsBefore);
			});

			it('updates the Bombs Left field after flagging a tile', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await minesweeper.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;

				collector.emit('collect', {
					user: { id: 'user-123' },
					customId: 'flag',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				// Last editReply should show Bombs Left = 9 (one flag placed)
				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				const fields = lastCall.embeds?.[0]?.toJSON().fields ?? [];
				const bombsField = fields.find((f: { name: string }) => f.name === 'Bombs Left');
				expect(bombsField?.value).toBe('`9`');
			});

			it('shows the lose screen when the collector times out without a win', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await minesweeper.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;

				collector.stop(); // emits 'end' → lose() is called
				await flushPromises();

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.components).toEqual([]); // buttons removed on lose
				const fields = lastCall.embeds?.[0]?.toJSON().fields ?? [];
				const loseField = fields.find((f: { name: string }) => f.name === 'You Lose!');
				expect(loseField).toBeDefined();
			});
		});

		describe('gameLoop', () => {
			/** Builds a complete game object suitable for direct gameLoop() calls. */
			function makeDirectGame() {
				const board = generateBoard();
				const mockMsg = createMockMessage([new EmbedBuilder().setTitle('Minesweeper 💣')]);
				const interaction = createMockInteraction({ useMockMessage: true });

				return {
					board,
					buttons: makeGameButtons(),
					flags: 0,
					tilesLeft: NUM_OF_MINES * 2, // arbitrary non-win value
					startTime: Date.now(),
					player: {
						emoji: '😎',
						walls: '🟩',
						x: 1,
						y: 1,
						tileStatus: 0,
						lost: false,
						won: false
					},
					componentCollector: null,
					interaction,
					embed: mockMsg as never,
					timeout: 10 * 60000
				};
			}

			it('shows the lose embed and calls saveData when player digs a mine', async () => {
				mockMinesweeperStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					totalGames: 0,
					fastestTime: 9999,
					userID: 'user-123'
				});

				const game = makeDirectGame();
				// Force the current player tile to be a mine
				game.board[1][1].mine = true;
				game.board[1][1].status = 0;

				await gameLoop(game, 'dig' as never);

				expect(game.player.lost).toBe(true);
				// saveData should have called findOneAndUpdate (upsert + update)
				expect(mockMinesweeperStats.findOneAndUpdate).toHaveBeenCalled();
				// Lose embed: no components, "You Lose!" field
				const calls = (game.interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.components).toEqual([]);
				const fields = lastCall.embeds?.[0]?.toJSON().fields ?? [];
				expect(fields.some((f: { name: string }) => f.name === 'You Lose!')).toBe(true);
			});

			it('shows the win embed and calls saveData when the last safe tile is revealed', async () => {
				mockMinesweeperStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					totalGames: 0,
					fastestTime: 9999,
					userID: 'user-123'
				});

				const game = makeDirectGame();
				// Set tilesLeft so one dig puts us at NUM_OF_MINES (winning condition)
				game.tilesLeft = NUM_OF_MINES + 1;
				// Ensure player tile is not a mine and has num>0 (no flood fill) so exactly 1 tile is revealed
				game.board[1][1].mine = false;
				game.board[1][1].num = 1;
				game.board[1][1].status = 0;

				await gameLoop(game, 'dig' as never);

				expect(game.player.won).toBe(true);
				const calls = (game.interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.components).toEqual([]);
				const fields = lastCall.embeds?.[0]?.toJSON().fields ?? [];
				expect(fields.some((f: { name: string }) => f.name === 'You Win!')).toBe(true);
			});
		});

		describe('database', () => {
			it('does not call writeToDatabase and logs error when saveData write returns null', async () => {
				const { writeToDatabase } = jest.requireMock('../../../src/util/database').default;

				// First findOneAndUpdate (upsert) succeeds; second (the update) returns null
				mockMinesweeperStats.findOneAndUpdate
					.mockResolvedValueOnce({
						wins: 0,
						totalGames: 0,
						fastestTime: 9999,
						userID: 'user-123'
					})
					.mockResolvedValueOnce(null);

				const game = (() => {
					const board = generateBoard();
					const mockMsg = createMockMessage([
						new EmbedBuilder().setTitle('Minesweeper 💣')
					]);
					const interaction = createMockInteraction({ useMockMessage: true });
					return {
						board,
						buttons: makeGameButtons(),
						flags: 0,
						tilesLeft: NUM_OF_MINES + 1,
						startTime: Date.now(),
						player: {
							emoji: '😎',
							walls: '🟩',
							x: 1,
							y: 1,
							tileStatus: 0,
							lost: false,
							won: false
						},
						componentCollector: null,
						interaction,
						embed: mockMsg as never,
						timeout: 10 * 60000
					};
				})();

				// Win path: tilesLeft == numOfMines after 1 dig
				game.board[1][1].mine = false;
				game.board[1][1].num = 1;
				game.board[1][1].status = 0;

				await gameLoop(game, 'dig' as never);

				expect(writeToDatabase).not.toHaveBeenCalled();
			});
			it('calls writeToDatabase on game end', async () => {
				const { writeToDatabase } = jest.requireMock('../../../src/util/database').default;

				// First findOneAndUpdate (upsert) succeeds; second (the update) returns null
				mockMinesweeperStats.findOneAndUpdate
					.mockResolvedValueOnce({
						wins: 0,
						totalGames: 0,
						fastestTime: 9999,
						userID: 'user-123'
					})
					.mockResolvedValueOnce({});

				const game = (() => {
					const board = generateBoard();
					const mockMsg = createMockMessage([
						new EmbedBuilder().setTitle('Minesweeper 💣')
					]);
					const interaction = createMockInteraction({ useMockMessage: true });
					return {
						board,
						buttons: makeGameButtons(),
						flags: 0,
						tilesLeft: NUM_OF_MINES + 1,
						startTime: Date.now(),
						player: {
							emoji: '😎',
							walls: '🟩',
							x: 1,
							y: 1,
							tileStatus: 0,
							lost: false,
							won: false
						},
						componentCollector: null,
						interaction,
						embed: mockMsg as never,
						timeout: 10 * 60000
					};
				})();

				// Win path: tilesLeft == numOfMines after 1 dig
				game.board[1][1].mine = false;
				game.board[1][1].num = 1;
				game.board[1][1].status = 0;

				await gameLoop(game, 'dig' as never);

				expect(writeToDatabase).toHaveBeenCalled();
			});
		});
	});
});
