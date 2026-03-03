jest.mock('../../../src/logging', () => ({
	logger: {
		child: jest
			.fn()
			.mockReturnValue({
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

/*
 * This module exports both a Command (via module.exports = ...) and named test helpers
 * (via module.exports.x = x). TypeScript only knows about the Command type, so the named
 * exports cannot be reached via import syntax — require() with a type cast is necessary.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const minesweeper = require('../../../src/commands/minigames/minesweeper');
const {
	generateBoard,
	generateMines,
	calculateTileNum,
	checkTile,
	positionMatch,
	randomNumber,
	getNumber
} = minesweeper;

import { createMockInteraction } from '../../helpers/mockInteraction';

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

// ---------------------------------------------------------------------------

describe('minesweeper internals', () => {
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
});

// ---------------------------------------------------------------------------

describe('/minesweeper command', () => {
	describe('help subcommand', () => {
		it('calls editReply with an embed', async () => {
			const interaction = createMockInteraction({ subcommand: 'help' });
			await minesweeper.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ embeds: expect.any(Array) })
			);
		});
	});

	describe('leaderboards subcommand', () => {
		beforeEach(() => {
			// Return empty arrays so leaderboard util receives no data (it's mocked anyway)
			mockMinesweeperStats.find.mockResolvedValue([]);
		});

		it.each(['fastest', 'played', 'wins'])(
			'calls editReply with an embed for type "%s"',
			async (type) => {
				const interaction = createMockInteraction({
					subcommand: 'leaderboards',
					getString: { type }
				});
				await minesweeper.execute(interaction);
				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({ embeds: expect.any(Array) })
				);
			}
		);
	});

	describe('stats subcommand', () => {
		it('replies with "No Data" embed when user is not in the database', async () => {
			mockMinesweeperStats.findOne.mockResolvedValue(null);
			const interaction = createMockInteraction({ subcommand: 'stats' });
			await minesweeper.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().title).toBe('No Data');
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
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().title).toBe('User Statistics');
			// Wins and total games should appear in the embed description
			expect(embeds[0].toJSON().description).toContain('5');
			expect(embeds[0].toJSON().description).toContain('10');
		});
	});
});
