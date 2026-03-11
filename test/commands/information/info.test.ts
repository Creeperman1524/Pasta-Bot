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

// Mock node-fetch before importing the command (it runs getCurrentBuildCommit on load)
jest.mock('node-fetch', () => jest.fn());
import nodeFetch from 'node-fetch';

import { createMockInteraction } from '../../helpers/mockInteraction';

describe('/info', () => {
	beforeEach(() => jest.clearAllMocks());

	it('calls editReply with an embed and a button component row', async () => {
		(nodeFetch as unknown as jest.Mock).mockResolvedValue({
			json: jest.fn().mockResolvedValue({
				commit: { sha: 'abc12345', commit: { author: { date: '2026-01-01T00:00:00Z' } } }
			})
		});

		// Re-require so the fetch mock is active during module load
		jest.resetModules();
		jest.mock('node-fetch', () =>
			jest.fn().mockResolvedValue({
				json: jest.fn().mockResolvedValue({
					commit: {
						sha: 'abc12345',
						commit: { author: { date: '2026-01-01T00:00:00Z' } }
					}
				})
			})
		);
		const command = await import('../../../src/commands/information/info');
		const interaction = createMockInteraction({ guildSize: 3 });
		await command.default.execute(interaction);

		const [callArgs] = (interaction.editReply as jest.Mock).mock.calls;
		expect(callArgs[0]).toHaveProperty('embeds');
		expect(callArgs[0]).toHaveProperty('components');
	});

	it('embed includes Total Servers field', async () => {
		jest.resetModules();
		jest.mock('node-fetch', () =>
			jest.fn().mockResolvedValue({
				json: jest.fn().mockResolvedValue({
					commit: {
						sha: 'deadbeef',
						commit: { author: { date: '2026-01-01T00:00:00Z' } }
					}
				})
			})
		);
		const command = await import('../../../src/commands/information/info');
		const interaction = createMockInteraction({ guildSize: 5 });
		await command.default.execute(interaction);

		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		const fields: { name: string; value: string }[] = embeds[0].toJSON().fields ?? [];
		const serversField = fields.find((f) => f.name === 'Total Servers');
		expect(serversField).toBeDefined();
		expect(serversField?.value).toContain('5');
	});

	it('embed includes Uptime field', async () => {
		jest.resetModules();
		jest.mock('node-fetch', () =>
			jest.fn().mockResolvedValue({
				json: jest.fn().mockResolvedValue({
					commit: {
						sha: 'deadbeef',
						commit: { author: { date: '2026-01-01T00:00:00Z' } }
					}
				})
			})
		);
		const command = await import('../../../src/commands/information/info');
		const interaction = createMockInteraction();
		await command.default.execute(interaction);

		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		const fields: { name: string; value: string }[] = embeds[0].toJSON().fields ?? [];
		const uptimeField = fields.find((f) => f.name === 'Uptime');
		expect(uptimeField).toBeDefined();
	});

	it('embed shows fallback when fetch fails', async () => {
		jest.resetModules();
		jest.mock('node-fetch', () => jest.fn().mockRejectedValue(new Error('network error')));

		const command = await import('../../../src/commands/information/info');
		const interaction = createMockInteraction();
		// Wait a tick for the module-level fetch to settle
		await new Promise((r) => setTimeout(r, 50));
		await command.default.execute(interaction);

		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		const fields: { name: string; value: string }[] = embeds[0].toJSON().fields ?? [];
		const buildField = fields.find((f) => f.name === 'Build');
		expect(buildField?.value).toContain('Could not fetch');
	});
});
