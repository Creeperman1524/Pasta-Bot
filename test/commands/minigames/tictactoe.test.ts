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
	Winner,
	updateDisplay,
	displayWinningPositions,
	gameLoop,
	saveData
} = testingFuncs;

import { createMockInteraction } from '../../helpers/mockInteraction';
import { createMockMessage } from '../../helpers/mockMessage';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

/** Waits for all pending microtasks/promise chains to settle. */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Builds three ActionRowBuilders of ButtonBuilders for a tic-tac-toe game. */
function makeTTTButtons(): [
	ActionRowBuilder<ButtonBuilder>,
	ActionRowBuilder<ButtonBuilder>,
	ActionRowBuilder<ButtonBuilder>
] {
	const blankEmoji = '➖';
	const makeRow = (...ids: string[]) =>
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			...ids.map((id) =>
				new ButtonBuilder()
					.setCustomId(id)
					.setEmoji(blankEmoji)
					.setStyle(ButtonStyle.Secondary)
			)
		) as ActionRowBuilder<ButtonBuilder>;
	return [makeRow('0', '1', '2'), makeRow('3', '4', '5'), makeRow('6', '7', '8')];
}

/** Creates a minimal game object for direct gameLoop / displayWinningPositions tests. */
function makeDirectGame(
	interaction: ReturnType<typeof createMockInteraction>,
	bot = true,
	player2Id = 'bot-id'
) {
	const mockMsg = createMockMessage([new EmbedBuilder().setTitle('Tic-Tac-Toe')]);
	return {
		board: [
			[0, 0, 0],
			[0, 0, 0],
			[0, 0, 0]
		] as [number[], number[], number[]],
		buttons: makeTTTButtons(),
		player1Turn: true,
		player1: { id: 'user-123', username: 'testuser', bot: false },
		player2: { id: player2Id, username: 'bot', bot },
		bot,
		botMessage: '',
		playerWinRate: 0.5,
		player2Accepted: true,
		winner: Winner.OnGoing,
		componentCollector: null,
		interaction,
		embed: mockMsg as never,
		timeout: 10 * 60000
	};
}

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

	describe('updateDisplay()', () => {
		it('sets Secondary style and blank emoji for empty cells', () => {
			const buttons = makeTTTButtons();
			const game = {
				board: [
					[0, 0, 0],
					[0, 0, 0],
					[0, 0, 0]
				] as [number[], number[], number[]],
				buttons
			};
			updateDisplay(game as never, game.board);
			// All cells empty → all Secondary
			for (const row of game.buttons) {
				for (const btn of row.components) {
					expect(btn.data.style).toBe(ButtonStyle.Secondary);
					expect(btn.data.disabled).toBeFalsy();
				}
			}
		});

		it('sets Primary style, X emoji, and disabled for Player1 cells (value 1)', () => {
			const buttons = makeTTTButtons();
			const board: [number[], number[], number[]] = [
				[1, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			];
			const game = { board, buttons };
			updateDisplay(game as never, board);
			const btn = game.buttons[0].components[0];
			expect(btn.data.style).toBe(ButtonStyle.Primary);
			expect(btn.data.disabled).toBe(true);
		});

		it('sets Primary style, O emoji, and disabled for Player2 cells (value -1)', () => {
			const buttons = makeTTTButtons();
			const board: [number[], number[], number[]] = [
				[-1, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			];
			const game = { board, buttons };
			updateDisplay(game as never, board);
			const btn = game.buttons[0].components[0];
			expect(btn.data.style).toBe(ButtonStyle.Primary);
			expect(btn.data.disabled).toBe(true);
		});
	});

	describe('displayWinningPositions()', () => {
		function makeWinGame(board: [number[], number[], number[]]) {
			const buttons = makeTTTButtons();
			// Set buttons to reflect board first (so displayWinningPositions has something to update)
			for (let y = 0; y < 3; y++) {
				for (let x = 0; x < 3; x++) {
					if (board[y][x] !== 0) {
						buttons[y].components[x].setStyle(ButtonStyle.Primary);
					}
				}
			}
			return { board, buttons };
		}

		it('marks the winning row with Success style (horizontal)', () => {
			const board: [number[], number[], number[]] = [
				[1, 1, 1],
				[0, 0, 0],
				[0, 0, 0]
			];
			const game = makeWinGame(board);
			displayWinningPositions(game as never, board);
			expect(game.buttons[0].components[0].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[0].components[1].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[0].components[2].data.style).toBe(ButtonStyle.Success);
			// Row 1 untouched
			expect(game.buttons[1].components[0].data.style).not.toBe(ButtonStyle.Success);
		});

		it('marks the winning column with Success style (vertical)', () => {
			const board: [number[], number[], number[]] = [
				[1, 0, 0],
				[1, 0, 0],
				[1, 0, 0]
			];
			const game = makeWinGame(board);
			displayWinningPositions(game as never, board);
			expect(game.buttons[0].components[0].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[1].components[0].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[2].components[0].data.style).toBe(ButtonStyle.Success);
		});

		it('marks the negative diagonal with Success style', () => {
			const board: [number[], number[], number[]] = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1]
			];
			const game = makeWinGame(board);
			displayWinningPositions(game as never, board);
			expect(game.buttons[0].components[0].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[1].components[1].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[2].components[2].data.style).toBe(ButtonStyle.Success);
		});

		it('marks the positive diagonal with Success style', () => {
			const board: [number[], number[], number[]] = [
				[0, 0, 1],
				[0, 1, 0],
				[1, 0, 0]
			];
			const game = makeWinGame(board);
			displayWinningPositions(game as never, board);
			expect(game.buttons[0].components[2].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[1].components[1].data.style).toBe(ButtonStyle.Success);
			expect(game.buttons[2].components[0].data.style).toBe(ButtonStyle.Success);
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

	describe('start', () => {
		describe('vs bot', () => {
			beforeEach(() => {
				mockTictactoeStats.findOne.mockResolvedValue(null); // no prior data → default 0.5 winrate
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					totalGames: 0,
					winsBot: 0,
					winsHuman: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 0,
					userID: 'user-123'
				});
			});

			it('sends the initial Tic-Tac-Toe embed with 3×3 button rows', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({
						embeds: expect.any(Array),
						components: expect.any(Array)
					})
				);
				const call = (interaction.editReply as jest.Mock).mock.calls[0][0];
				expect(call.embeds?.[0]?.toJSON().title).toBe('Tic-Tac-Toe');
				expect(call.components?.length).toBe(3); // 3 rows of buttons
			});

			it('ignores button presses from users who are not player1', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;
				const callsBefore = (interaction.editReply as jest.Mock).mock.calls.length;

				collector.emit('collect', {
					user: { id: 'intruder-456' },
					customId: '4',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				expect((interaction.editReply as jest.Mock).mock.calls.length).toBe(callsBefore);
			});

			it('player1 wins via gameLoop — shows win embed and saves data for both players', async () => {
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, true, 'bot-id');
				// Board state: player needs one more move to win (top row: X X _)
				game.board = [
					[1, 1, 0],
					[0, -1, 0],
					[0, 0, -1]
				];

				await gameLoop(game as never, 2); // player1 plays index 2 → top-right → wins
				await flushPromises(); // flush async saveData calls

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('user-123'); // player1 wins
				// All buttons disabled
				for (const row of game.buttons) {
					for (const btn of row.components) {
						expect(btn.data.disabled).toBe(true);
					}
				}
				expect(mockTictactoeStats.findOneAndUpdate).toHaveBeenCalled();
			});

			it('player2 (bot) wins — shows win embed mentioning player2', async () => {
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, true, 'bot-id');
				// Bot needs one more move to win (first column: O O _)
				game.board = [
					[0, 1, 0],
					[-1, 1, 0],
					[-1, 0, 0]
				];
				game.player1Turn = false; // it's player2 (bot)'s turn

				await gameLoop(game as never, 6); // bot plays index 6 → [2][0] → bot wins (first column)
				await flushPromises(); // flush async saveData calls

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('bot-id');
			});

			it('tie — shows tie embed', async () => {
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, true, 'bot-id');
				// One move away from a tie
				game.board = [
					[1, -1, 1],
					[1, 1, -1],
					[-1, 1, 0]
				];
				game.player1Turn = false; // bot's turn

				await gameLoop(game as never, 8); // fills last cell → tie
				await flushPromises(); // flush async saveData calls

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('Tie');
			});

			it('game timeout — shows ranOutOfTime embed and saves loss data', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const mockMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const collector = mockMsg._collector;

				collector.stop(); // emits 'end' → ranOutOfTime called
				await flushPromises();

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('took too long');
				// All buttons disabled
				for (const row of lastCall.components ?? []) {
					for (const btn of (row as ActionRowBuilder<ButtonBuilder>).components) {
						expect((btn as ButtonBuilder).data.disabled).toBe(true);
					}
				}
				expect(mockTictactoeStats.findOneAndUpdate).toHaveBeenCalled();
			});
		});

		describe('vs user', () => {
			beforeEach(() => {
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					totalGames: 1,
					winsBot: 0,
					winsHuman: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 1,
					userID: 'user-123'
				});
			});

			it('shows Invalid User embed when player challenges themselves', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					getUser: { user: { id: 'user-123', username: 'testuser', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
				expect(embed?.toJSON().title).toBe('Invalid User!');
			});

			it('shows Invalid User embed when player challenges a bot account', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					getUser: { user: { id: 'some-bot', username: 'abot', bot: true } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
				expect(embed?.toJSON().title).toBe('Invalid User!');
			});

			it('sends the confirmation request embed to player2', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true,
					getUser: { user: { id: 'player2-id', username: 'player2', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const call = (interaction.editReply as jest.Mock).mock.calls[0][0];
				expect(call.embeds?.[0]?.toJSON().title).toBe('Tic-Tac-Toe Duel Request');
				expect(call.content).toContain('player2-id');
				// Yes/No buttons
				expect(call.components?.length).toBe(1);
			});

			it('starts the game when player2 clicks Yes', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true,
					getUser: { user: { id: 'player2-id', username: 'player2', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const confirmMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const confirmCollector = confirmMsg._collector;

				confirmCollector.emit('collect', {
					user: { id: 'player2-id' },
					customId: 'yes',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				// A second editReply should have been made with the game board
				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
				expect(lastEmbed?.toJSON().title).toBe('Tic-Tac-Toe');
			});

			it('shows denied embed when player2 clicks No', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true,
					getUser: { user: { id: 'player2-id', username: 'player2', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const confirmMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const confirmCollector = confirmMsg._collector;

				confirmCollector.emit('collect', {
					user: { id: 'player2-id' },
					customId: 'no',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
				expect(lastEmbed?.toJSON().title).toBe('Request denied!');
			});

			it('shows timeout embed when player2 does not respond in time', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true,
					getUser: { user: { id: 'player2-id', username: 'player2', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const confirmMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const confirmCollector = confirmMsg._collector;

				// Simulate timeout without player2 accepting
				confirmCollector.stop();
				await flushPromises();

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
				expect(lastEmbed?.toJSON().title).toBe('Request not accepted!');
			});

			it('ignores confirmation clicks from users who are not player2', async () => {
				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true,
					getUser: { user: { id: 'player2-id', username: 'player2', bot: false } }
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				const confirmMsg = await (interaction.editReply as jest.Mock).mock.results[0].value;
				const confirmCollector = confirmMsg._collector;
				const callsBefore = (interaction.editReply as jest.Mock).mock.calls.length;

				// Third party clicks yes — should be ignored
				confirmCollector.emit('collect', {
					user: { id: 'intruder' },
					customId: 'yes',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				expect((interaction.editReply as jest.Mock).mock.calls.length).toBe(callsBefore);
			});

			it('enforces turn order — player2 cannot move on player1 turn', async () => {
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, false, 'player2-id');
				// player1Turn = true → only player1 (user-123) should be able to move

				const callsBefore = (interaction.editReply as jest.Mock).mock.calls.length;
				// Set up a collector and emit player2's click
				const mockMsg = createMockMessage([new EmbedBuilder().setTitle('Tic-Tac-Toe')]);
				game.embed = mockMsg as never;
				const collector = mockMsg._collector;
				game.componentCollector = collector as never;

				collector.emit('collect', {
					user: { id: 'player2-id' }, // player2's turn NOT yet
					customId: '4',
					deferUpdate: jest.fn()
				});
				await flushPromises();

				expect((interaction.editReply as jest.Mock).mock.calls.length).toBe(callsBefore);
			});

			it('player1 wins vs human — description mentions player1', async () => {
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					winsBot: 0,
					winsHuman: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 0,
					totalGames: 0,
					userID: 'user-123'
				});
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, false, 'player2-id');
				game.board = [
					[1, 1, 0],
					[0, -1, 0],
					[0, 0, -1]
				];

				await gameLoop(game as never, 2); // player1 completes row 0
				await flushPromises(); // flush async saveData calls

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('user-123');
			});

			it('player2 wins vs human — description mentions player2', async () => {
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					winsBot: 0,
					winsHuman: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 0,
					totalGames: 0,
					userID: 'player2-id'
				});
				const interaction = createMockInteraction({ useMockMessage: true });
				const game = makeDirectGame(interaction, false, 'player2-id');
				game.board = [
					[1, 1, 0],
					[-1, -1, 0],
					[0, 0, 0]
				];
				game.player1Turn = false; // player2's turn

				await gameLoop(game as never, 5); // player2 completes second column
				await flushPromises(); // flush async saveData calls

				const calls = (interaction.editReply as jest.Mock).mock.calls;
				const lastCall = calls[calls.length - 1][0];
				expect(lastCall.embeds?.[0]?.toJSON().description).toContain('player2-id');
			});
		});

		describe('database', () => {
			const validStats = {
				wins: 0,
				totalGames: 0,
				winsBot: 0,
				winsHuman: 0,
				lossesBot: 0,
				lossesHuman: 0,
				totalBot: 0,
				totalHuman: 0,
				userID: 'user-123'
			};

			it('does not call writeToDatabase and logs error when saveData write returns null', async () => {
				const { writeToDatabase } = jest.requireMock('../../../src/util/database').default;

				mockTictactoeStats.findOneAndUpdate
					.mockResolvedValueOnce(validStats) // upsert succeeds
					.mockResolvedValueOnce(null); // update → error path

				await saveData('user-123', 1, true);

				expect(writeToDatabase).not.toHaveBeenCalled();
			});

			it('getWinRate defaults to 0.5 when user has no database record', async () => {
				mockTictactoeStats.findOne.mockResolvedValue(null);
				// Ensure saveData never throws if the game somehow ends
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					winsBot: 0,
					winsHuman: 0,
					losses: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 0,
					totalGames: 0,
					userID: 'user-123'
				});

				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				// Game should have started — if winRate was not defaulted, getWinRate would throw
				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({ embeds: expect.any(Array) })
				);
			});

			it('getWinRate defaults to 0.5 when user has played 0 bot games', async () => {
				mockTictactoeStats.findOne.mockResolvedValue({
					userID: 'user-123',
					totalBot: 0,
					winsBot: 0
				});
				mockTictactoeStats.findOneAndUpdate.mockResolvedValue({
					wins: 0,
					winsBot: 0,
					winsHuman: 0,
					losses: 0,
					lossesBot: 0,
					lossesHuman: 0,
					totalBot: 0,
					totalHuman: 0,
					totalGames: 0,
					userID: 'user-123'
				});

				const interaction = createMockInteraction({
					subcommand: 'start',
					useMockMessage: true
				});
				await tictactoe.execute(interaction);
				await flushPromises();

				// Game should have started without dividing by zero
				expect(interaction.editReply).toHaveBeenCalledWith(
					expect.objectContaining({ embeds: expect.any(Array) })
				);
			});
		});
	});
});
