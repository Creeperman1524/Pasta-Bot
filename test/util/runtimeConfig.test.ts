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

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../../src/schemas/botConfigs.schema', () => ({
	__esModule: true,
	default: {
		findOne: (...args: unknown[]) => mockFindOne(...args),
		create: (...args: unknown[]) => mockCreate(...args),
		findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args)
	}
}));

jest.mock('../../src/util/database', () => ({
	__esModule: true,
	default: {
		writeToDatabase: jest.fn()
	}
}));

import { getMCConfig, invalidateMCConfigCache } from '../../src/util/runtimeConfig';

describe('runtimeConfig', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.clientID = 'bot-123';
		process.env.mcServerIP = '127.0.0.1';
		process.env.mcServerSeed = 'test-seed';
		invalidateMCConfigCache();
		jest.clearAllMocks();
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('serves repeated reads from cache within TTL', async () => {
		mockFindOne.mockResolvedValue({
			mcServerIP: '127.0.0.1',
			mcServerSeed: 'seed',
			mcServerPort: '25565',
			mcServerVersion: '1.21.4'
		});

		const first = await getMCConfig();
		const second = await getMCConfig();

		expect(first).toEqual(second);
		expect(mockFindOne).toHaveBeenCalledTimes(1);
	});

	it('seeds missing bot config from legacy values', async () => {
		mockFindOne.mockResolvedValue(null);
		mockCreate.mockResolvedValue({
			mcServerIP: '127.0.0.1',
			mcServerSeed: 'test-seed',
			mcServerPort: '25565',
			mcServerVersion: '1.21.4'
		});

		const config = await getMCConfig();

		expect(mockCreate).toHaveBeenCalled();
		expect(config.mcServerIP).toBe('127.0.0.1');
		expect(config.mcServerSeed).toBe('test-seed');
	});
});
