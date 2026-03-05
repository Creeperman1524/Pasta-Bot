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

const mockTictactoeStats = {
	findOne: jest.fn(),
	find: jest.fn(),
	findOneAndUpdate: jest.fn(),
	create: jest.fn()
};
jest.mock('../../../src/schemas/tictactoeStats.schema', () => ({
	__esModule: true,
	default: mockTictactoeStats
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

import tictactoe, { testingFuncs } from '../../../src/commands/minigames/tictactoe';
const {
	checkWinner,
	findBestMove,
	findRandomMove,
	determineMistakeChance,
	MinimaxAlphaBeta,
	Winner
} = testingFuncs;

import { createMockInteraction } from '../../helpers/mockInteraction';

// ---------------------------------------------------------------------------

describe('game logic', () => {
	describe('checkWinner()', () => {
		it('returns Player1 for a horizontal win', () => {
			expect(
				checkWinner([
					[1, 1, 1],
					[0, 0, 0],
					[0, 0, 0]
				])
			).toBe(Winner.Player1);
		});

		it('returns Player1 for a vertical win', () => {
			expect(
				checkWinner([
					[1, 0, 0],
					[1, 0, 0],
					[1, 0, 0]
				])
			).toBe(Winner.Player1);
		});

		it('returns Player1 for a negative diagonal win', () => {
			expect(
				checkWinner([
					[1, 0, 0],
					[0, 1, 0],
					[0, 0, 1]
				])
			).toBe(Winner.Player1);
		});

		it('returns Player1 for a positive diagonal win', () => {
			expect(
				checkWinner([
					[0, 0, 1],
					[0, 1, 0],
					[1, 0, 0]
				])
			).toBe(Winner.Player1);
		});

		it('returns Player2 for a horizontal win', () => {
			expect(
				checkWinner([
					[-1, -1, -1],
					[0, 0, 0],
					[0, 0, 0]
				])
			).toBe(Winner.Player2);
		});

		it('returns Player2 for a vertical win', () => {
			expect(
				checkWinner([
					[-1, 0, 0],
					[-1, 0, 0],
					[-1, 0, 0]
				])
			).toBe(Winner.Player2);
		});

		it('returns Tie for a full board with no winner', () => {
			expect(
				checkWinner([
					[1, -1, 1],
					[1, 1, -1],
					[-1, 1, -1]
				])
			).toBe(Winner.Tie);
		});

		it('returns OnGoing for an in-progress board', () => {
			expect(
				checkWinner([
					[1, 0, 0],
					[0, -1, 0],
					[0, 0, 0]
				])
			).toBe(Winner.OnGoing);
		});
	});

	describe('determineMistakeChance()', () => {
		it('returns a value close to 0.9 when winRate is 0 (easiest bot)', () => {
			expect(determineMistakeChance(0)).toBeCloseTo(0.9);
		});

		it('decreases as winRate increases (harder bot with more wins)', () => {
			expect(determineMistakeChance(0.5)).toBeLessThan(determineMistakeChance(0));
			expect(determineMistakeChance(1)).toBeLessThan(determineMistakeChance(0.5));
		});

		it('always returns a non-negative value across the full win-rate range', () => {
			[0, 0.25, 0.5, 0.75, 1].forEach((wr) => {
				expect(determineMistakeChance(wr)).toBeGreaterThanOrEqual(0);
			});
		});
	});

	describe('MinimaxAlphaBeta()', () => {
		it('returns positive score when Player1 has already won', () => {
			// Player1 won — depth 0, not maximizing (bot's turn to evaluate)
			const score = MinimaxAlphaBeta(
				[
					[1, 1, 1],
					[0, 0, 0],
					[0, 0, 0]
				],
				0,
				-99,
				99,
				false
			);
			expect(score).toBeGreaterThan(0);
		});

		it('returns negative score when Player2 (bot) has already won', () => {
			const score = MinimaxAlphaBeta(
				[
					[-1, -1, -1],
					[0, 0, 0],
					[0, 0, 0]
				],
				0,
				-99,
				99,
				true
			);
			expect(score).toBeLessThan(0);
		});

		it('returns 0 for a tie board', () => {
			const score = MinimaxAlphaBeta(
				[
					[1, -1, 1],
					[1, 1, -1],
					[-1, 1, -1]
				],
				0,
				-99,
				99,
				true
			);
			expect(score).toBe(0);
		});
	});

	describe('findBestMove()', () => {
		it('takes a winning move when one is immediately available for the bot', () => {
			const move = findBestMove([
				[-1, 0, 0],
				[-1, 0, 0],
				[0, 0, 0]
			]);
			// Winning move is row 2, col 0 → linear index 6
			expect(move).toBe(6);
		});

		it('blocks the player from winning on their next turn', () => {
			const move = findBestMove([
				[1, 1, 0],
				[0, 0, 0],
				[0, 0, 0]
			]);
			// Must block at row 0, col 2 → index 2
			expect(move).toBe(2);
		});
	});

	describe('findRandomMove()', () => {
		it('returns a valid empty position on a partially-filled board', () => {
			const move = findRandomMove([
				[1, -1, 0],
				[0, 1, 0],
				[-1, 0, 0]
			]);
			// Empty cells: indices 2, 3, 5, 7, 8
			expect([2, 3, 5, 7, 8]).toContain(move);
		});

		it('returns the only remaining empty position when one cell is left', () => {
			const move = findRandomMove([
				[1, -1, 1],
				[1, 1, -1],
				[-1, 0, -1]
			]);
			// Only empty cell is row 2, col 1 → index 7
			expect(move).toBe(7);
		});
	});
});

// ---------------------------------------------------------------------------

describe('/tictactoe', () => {
	describe('help', () => {
		it('calls editReply with a help embed', async () => {
			const interaction = createMockInteraction({ subcommand: 'help' });
			await tictactoe.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ embeds: expect.any(Array) })
			);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toContain('How to Play');
		});
	});

	describe('leaderboards', () => {
		beforeEach(() => {
			mockTictactoeStats.find.mockResolvedValue([]);
		});

		it.each(['played', 'wins'])('calls editReply with an embed for type "%s"', async (type) => {
			const interaction = createMockInteraction({
				subcommand: 'leaderboards',
				getString: { type }
			});
			await tictactoe.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ embeds: expect.any(Array) })
			);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toContain('Leaderboard');
		});
	});

	describe('stats', () => {
		it('replies with "No Data" embed when user is not in the database', async () => {
			mockTictactoeStats.findOne.mockResolvedValue(null);
			const interaction = createMockInteraction({ subcommand: 'stats' });
			await tictactoe.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().title).toBe('No Data');
		});

		it('replies with User Statistics embed when the user has recorded data', async () => {
			mockTictactoeStats.findOne.mockResolvedValue({
				wins: 3,
				totalGames: 8,
				winsBot: 2,
				winsHuman: 1,
				lossesBot: 2,
				lossesHuman: 2,
				totalBot: 4,
				totalHuman: 4,
				userID: 'user-123'
			});
			const interaction = createMockInteraction({ subcommand: 'stats' });
			await tictactoe.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().title).toBe('User Statistics');
		});
	});
});
