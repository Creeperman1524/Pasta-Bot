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

const mockValorantFind = jest.fn();
const mockValorantUpdate = jest.fn();
jest.mock('../../../src/schemas/valorantConfig.schema', () => ({
	__esModule: true,
	default: { findOne: mockValorantFind, findOneAndUpdate: mockValorantUpdate }
}));

const mockGuildFind = jest.fn();
jest.mock('../../../src/schemas/guildConfigs.schema', () => ({
	__esModule: true,
	default: { findOne: mockGuildFind, findOneAndUpdate: jest.fn() }
}));

jest.mock('../../../src/util/database', () => ({
	__esModule: true,
	default: { writeToDatabase: jest.fn() }
}));

import { createMockInteraction } from '../../helpers/mockInteraction';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import command from '../../../src/commands/valorant/rankRole';

function mockAccountResponse(data: object) {
	mockFetch.mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(data) });
}
function mockRankResponse(data: object) {
	mockFetch.mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(data) });
}

describe('/valorant command', () => {
	describe('link subcommand', () => {
		it('replies with error embed for API error code 22 (invalid account)', async () => {
			mockAccountResponse({
				status: 404,
				errors: [{ code: 22, message: 'bad', details: '' }]
			});
			const interaction = createMockInteraction({
				subcommand: 'link',
				getString: { name: 'TestUser', tagline: '1234' }
			});
			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().description).toMatch(/invalid/i);
		});

		it('replies with error embed for API error code 24 (not enough data)', async () => {
			mockAccountResponse({
				status: 404,
				errors: [{ code: 24, message: 'bad', details: '' }]
			});
			const interaction = createMockInteraction({
				subcommand: 'link',
				getString: { name: 'TestUser', tagline: '1234' }
			});
			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().description).toMatch(/match data/i);
		});

		it('saves PUUID and replies with success embed on API success', async () => {
			mockAccountResponse({ status: 200, data: { puuid: 'test-puuid-abc' } });
			mockValorantUpdate.mockResolvedValue({ puuid: 'test-puuid-abc', save: jest.fn() });
			const interaction = createMockInteraction({
				subcommand: 'link',
				getString: { name: 'TestUser', tagline: '1234' }
			});
			await command.execute(interaction);
			expect(mockValorantUpdate).toHaveBeenCalledWith(
				{ userID: 'user-123' },
				{ puuid: 'test-puuid-abc' }
			);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().title).toMatch(/Linked/i);
		});

		it('replies with error content when DB update fails', async () => {
			mockAccountResponse({ status: 200, data: { puuid: 'test-puuid-xyz' } });
			mockValorantUpdate.mockResolvedValue(null);
			const interaction = createMockInteraction({
				subcommand: 'link',
				getString: { name: 'TestUser', tagline: '1234' }
			});
			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastCall = calls[calls.length - 1][0];
			expect(lastCall.content ?? '').toMatch(/database/i);
		});
	});

	describe('update-role subcommand', () => {
		it('replies with "not linked" embed when no valorant config exists', async () => {
			mockValorantFind.mockResolvedValue(null);
			const interaction = createMockInteraction({ subcommand: 'update-role' });
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().title).toMatch(/not linked/i);
		});

		it('replies with error embed when rank API fails', async () => {
			mockValorantFind.mockResolvedValue({ puuid: 'abc' });
			mockRankResponse({
				status: 429,
				errors: [{ code: 429, message: 'rate', details: '' }]
			});
			const interaction = createMockInteraction({ subcommand: 'update-role' });
			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().title).toMatch(/wrong/i);
		});

		it('replies with "role not set" embed when guild has no valorant roles for rank', async () => {
			mockValorantFind.mockResolvedValue({ puuid: 'abc' });
			mockRankResponse({
				status: 200,
				data: { current: { tier: { name: 'Gold 2' } } }
			});
			mockGuildFind.mockResolvedValue({ valorantRoles: {} }); // no gold role
			const interaction = createMockInteraction({ subcommand: 'update-role' });
			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().title).toMatch(/Role not set/i);
		});

		it('replies with Unrated embed for unranked player', async () => {
			mockValorantFind.mockResolvedValue({ puuid: 'abc' });
			mockRankResponse({
				status: 200,
				data: { current: { tier: { name: 'Unrated' } } }
			});
			mockGuildFind.mockResolvedValue({ valorantRoles: { iron: 'role-id' } });

			const mockRole = { id: 'role-id' };
			const mockMember = {
				roles: { remove: jest.fn().mockResolvedValue(undefined), add: jest.fn() }
			};

			const interaction = createMockInteraction({ subcommand: 'update-role' });
			(interaction.guild!.roles.fetch as jest.Mock).mockResolvedValue(mockRole);
			(interaction.guild!.members.fetch as jest.Mock).mockResolvedValue(mockMember);

			await command.execute(interaction);
			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastEmbed = calls[calls.length - 1][0].embeds?.[0];
			expect(lastEmbed?.toJSON().description).toMatch(/Unrated/i);
		});
	});
});
