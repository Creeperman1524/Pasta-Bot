jest.mock('../../src/logging', () => ({
	logger: {
		child: jest.fn().mockReturnValue({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		})
	}
}));

const mockGetMinecraftRuntimeConfig = jest.fn().mockResolvedValue({
	mcServerIP: '127.0.0.1',
	mcServerSeed: 'test-seed-123',
	mcServerPort: '25565',
	mcServerVersion: '1.21.4'
});
jest.mock('../../src/util/runtimeConfig', () => ({
	getMinecraftRuntimeConfig: () => mockGetMinecraftRuntimeConfig()
}));

// Mock mcping-js
const mockPing = jest.fn();
jest.mock('mcping-js', () => ({
	MinecraftServer: jest.fn().mockImplementation(() => ({ ping: mockPing }))
}));

import displayServerModule from '../../src/status/displayServer';
import { Bot } from '../../src/util/types/bot';

// Ping response shape returned by mcping-js
type PingResult = {
	players: { online: number; max: number; sample?: { name: string }[] };
	version: { name: string };
	favicon: string;
};

function setupPing(err: Error | undefined, result: PingResult | null): void {
	mockPing.mockImplementation(
		(
			_timeout: unknown,
			_protocol: unknown,
			cb: (e: Error | undefined, r: PingResult | null) => void
		) => cb(err, result)
	);
}

describe('displayServer', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('logs error and returns undefined when runtime config lookup fails', async () => {
		mockGetMinecraftRuntimeConfig.mockRejectedValueOnce(new Error('config missing'));
		const result = await displayServerModule.execute({} as unknown as Bot);
		expect(result).toBeUndefined();
	});

	it('returns DoNotDisturb + offline message when ping returns an error', async () => {
		setupPing(new Error('timeout'), null);
		const result = await displayServerModule.execute({} as unknown as Bot);
		expect(result.message).toContain('offline');
		expect(result.activity).toBe('dnd');
	});

	it('returns Idle + X/Y players when server has no player sample', async () => {
		setupPing(undefined, {
			players: { online: 0, max: 20, sample: undefined },
			version: { name: '1.21' },
			favicon: ''
		});
		const result = await displayServerModule.execute({} as unknown as Bot);
		expect(result.message).toMatch(/\d+\/\d+ players/);
		expect(result.activity).toBe('idle');
	});

	it('returns Idle + sleepy server when sample is an empty array', async () => {
		setupPing(undefined, {
			players: { online: 0, max: 20, sample: [] },
			version: { name: '1.21' },
			favicon: ''
		});
		const result = await displayServerModule.execute({} as unknown as Bot);
		expect(result.message).toContain('sleepy');
		expect(result.activity).toBe('idle');
	});

	it('returns Online + sorted player list when players are online', async () => {
		setupPing(undefined, {
			players: { online: 2, max: 20, sample: [{ name: 'Zara' }, { name: 'Alice' }] },
			version: { name: '1.21' },
			favicon: ''
		});
		const result = await displayServerModule.execute({} as unknown as Bot);
		expect(result.activity).toBe('online');
		expect(result.message).toContain('Alice');
		expect(result.message).toContain('Zara');
		// Sorted: Alice before Zara
		expect(result.message.indexOf('Alice')).toBeLessThan(result.message.indexOf('Zara'));
	});
});
