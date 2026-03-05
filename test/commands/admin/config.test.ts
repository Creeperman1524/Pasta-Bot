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

const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
jest.mock('../../../src/schemas/guildConfigs.schema', () => ({
	__esModule: true,
	default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate }
}));

jest.mock('../../../src/util/database', () => ({
	__esModule: true,
	default: { writeToDatabase: jest.fn() }
}));

import { createMockInteraction } from '../../helpers/mockInteraction';

import command from '../../../src/commands/admin/config';

const baseData = {
	modules: {},
	valorantRoles: {},
	loggingChannelID: ''
};

describe('/config', () => {
	describe('set', () => {
		it('replies with error embed when no rule is provided', async () => {
			mockFindOneAndUpdate.mockResolvedValue({ ...baseData });
			const interaction = createMockInteraction({
				subcommand: 'set',
				getString: { rule: null }
			});
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalled();
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/No data/i);
		});

		it('replies with invalid-rule embed for unknown rule', async () => {
			mockFindOneAndUpdate.mockResolvedValue({ ...baseData });
			const interaction = createMockInteraction({
				subcommand: 'set',
				getString: { rule: 'fake-rule' }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/Invalid Rule/i);
		});

		it('replies with invalid-type embed when option type does not match', async () => {
			mockFindOneAndUpdate.mockResolvedValue({ ...baseData });
			const interaction = createMockInteraction({
				subcommand: 'set',
				getString: { rule: 'enable-logging' },
				getBoolean: { boolean: null } // boolean required but missing
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/Invalid Type/i);
		});

		it('correctly updates a boolean enable-* module and saves', async () => {
			const savedData = { ...baseData, modules: {}, save: jest.fn() };
			mockFindOneAndUpdate
				.mockResolvedValueOnce({ ...baseData }) // upsert
				.mockResolvedValueOnce(savedData); // update
			const interaction = createMockInteraction({
				subcommand: 'set',
				getString: { rule: 'enable-logging' },
				getBoolean: { boolean: true }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/Success/i);
		});

		it('correctly updates a valorant-role-* and saves', async () => {
			const savedData = { ...baseData, valorantRoles: {}, save: jest.fn() };
			mockFindOneAndUpdate
				.mockResolvedValueOnce({ ...baseData })
				.mockResolvedValueOnce(savedData);
			const mockRole = { id: '123456', name: 'Iron' };
			const interaction = createMockInteraction({
				subcommand: 'set',
				getString: { rule: 'valorant-role-iron' },
				getRole: { role: mockRole }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/Success/i);
		});
	});

	describe('view', () => {
		it('replies with no-data embed when guild has no configs', async () => {
			mockFindOne.mockResolvedValue(null);
			const interaction = createMockInteraction({ subcommand: 'view' });
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/No data/i);
		});

		it('replies with missing-rule embed when no rule is provided', async () => {
			mockFindOne.mockResolvedValue({ ...baseData });
			const interaction = createMockInteraction({
				subcommand: 'view',
				getString: { rule: null }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/No data/i);
		});

		it('shows current boolean module value', async () => {
			mockFindOne.mockResolvedValue({ modules: { logging: true }, valorantRoles: {} });
			const interaction = createMockInteraction({
				subcommand: 'view',
				getString: { rule: 'enable-logging' }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toBe('Config View');
			expect(embed?.toJSON().description).toContain('enable-logging');
			expect(embed?.toJSON().description).toContain('true');
		});

		it('shows "false" when boolean module value is not configured', async () => {
			mockFindOne.mockResolvedValue({ modules: {}, valorantRoles: {} });
			const interaction = createMockInteraction({
				subcommand: 'view',
				getString: { rule: 'enable-logging' }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toBe('Config View');
			expect(embed?.toJSON().description).toContain('enable-logging');
			expect(embed?.toJSON().description).toContain('false');
		});

		it('shows current role module value', async () => {
			mockFindOne.mockResolvedValue({ modules: {}, valorantRoles: { iron: '123456' } });
			const interaction = createMockInteraction({
				subcommand: 'view',
				getString: { rule: 'valorant-role-iron' }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().description).not.toContain('Unassigned');
			expect(embed?.toJSON().description).toContain('123456');
		});

		it('shows Unassigned when a valorant role is not configured', async () => {
			mockFindOne.mockResolvedValue({ modules: {}, valorantRoles: {} });
			const interaction = createMockInteraction({
				subcommand: 'view',
				getString: { rule: 'valorant-role-iron' }
			});
			await command.execute(interaction);
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().description).toContain('Unassigned');
		});
	});
});
