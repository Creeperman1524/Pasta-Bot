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

const mockPing = jest.fn();
jest.mock('mcping-js', () => ({
	MinecraftServer: jest.fn().mockImplementation(() => ({ ping: mockPing }))
}));

import command from '../../../src/commands/minecraft/server';
import { MinecraftServer } from 'mcping-js';
import { createMockInteraction } from '../../helpers/mockInteraction';

// Ping response shape returned by mcping-js
type PingResult = {
	players: { online: number; max: number; sample?: { name: string }[] };
	version: { name: string };
	favicon: string;
};

function setupPing(err: Error | null, res: PingResult | null): void {
	mockPing.mockImplementation(
		(
			_timeout: unknown,
			_protocol: unknown,
			cb: (e: Error | null, r: PingResult | null) => void
		) => cb(err, res)
	);
}

describe('/server command', () => {
	const origEnv = { ...process.env };

	beforeEach(() => {
		process.env.mcServerIP = '127.0.0.1';
		process.env.mcServerSeed = 'test-seed-123';
	});

	afterEach(() => {
		process.env = { ...origEnv };
	});

	describe('ip subcommand', () => {
		it('embed includes IP, port, and version fields', async () => {
			const interaction = createMockInteraction({ subcommand: 'ip' });
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			const fields: { name: string }[] = embeds[0].toJSON().fields ?? [];
			const names = fields.map((f) => f.name);
			expect(names).toContain('IP');
			expect(names).toContain('Port');
			expect(names).toContain('Version');
		});
	});

	describe('seed subcommand', () => {
		it('embed description contains the server seed', async () => {
			const interaction = createMockInteraction({ subcommand: 'seed' });
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().description).toContain('test-seed-123');
		});
	});

	describe('map subcommand', () => {
		it('embed description contains the server map URL', async () => {
			const interaction = createMockInteraction({ subcommand: 'map' });
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().description).toContain('127.0.0.1');
			expect(embeds[0].toJSON().description).toContain('8123');
		});
	});

	describe('status subcommand', () => {
		it('uses mcServerIP env var when no IP option is provided', async () => {
			setupPing(new Error('offline'), null);
			const interaction = createMockInteraction({
				subcommand: 'status',
				getString: { ip: null }
			});
			await command.execute(interaction);
			// Ping was called — the MinecraftServer constructor received the env IP
			expect(MinecraftServer).toHaveBeenCalledWith('127.0.0.1', expect.any(Number));
		});

		it('uses provided IP when option is given', async () => {
			setupPing(new Error('offline'), null);
			const interaction = createMockInteraction({
				subcommand: 'status',
				getString: { ip: '192.168.1.1' }
			});
			await command.execute(interaction);
			expect(MinecraftServer).toHaveBeenCalledWith('192.168.1.1', expect.any(Number));
		});

		it('replies with offline embed when ping returns an error', async () => {
			setupPing(new Error('timeout'), null);
			const interaction = createMockInteraction({
				subcommand: 'status',
				getString: { ip: null }
			});
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().description).toMatch(/offline/i);
		});

		it('replies with player count when nobody is online (no sample)', async () => {
			setupPing(null, {
				players: { online: 0, max: 20, sample: undefined },
				version: { name: '1.21' },
				favicon: ''
			});
			const interaction = createMockInteraction({
				subcommand: 'status',
				getString: { ip: null }
			});
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			expect(embeds[0].toJSON().description).toMatch(/No one is playing/i);
		});

		it('replies with sorted player list when players are online', async () => {
			setupPing(null, {
				players: { online: 2, max: 20, sample: [{ name: 'Zara' }, { name: 'Alice' }] },
				version: { name: '1.21' },
				favicon: ''
			});
			const interaction = createMockInteraction({
				subcommand: 'status',
				getString: { ip: null }
			});
			await command.execute(interaction);
			const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
			const desc: string = embeds[0].toJSON().description ?? '';
			expect(desc).toContain('Alice');
			expect(desc).toContain('Zara');
			expect(desc.indexOf('Alice')).toBeLessThan(desc.indexOf('Zara'));
		});
	});

	describe('wakeup subcommand', () => {
		it('replies with the discontinued message', async () => {
			const interaction = createMockInteraction({ subcommand: 'wakeup' });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.stringContaining('discontinued')
			);
		});
	});
});
