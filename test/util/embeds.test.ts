import { newEmbed, truncateText, colors } from '../../src/util/embeds';

// Suppress the logger noise from imports
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

describe('newEmbed', () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('returns an EmbedBuilder with version footer in production', () => {
		process.env.NODE_ENV = 'production';
		const embed = newEmbed();
		const data = embed.toJSON();
		expect(data.footer?.text).toMatch(/^v\d+\.\d+\.\d+$/);
		expect(data.footer?.text).not.toContain('DEV');
	});

	it('appends "- DEV" to footer when NODE_ENV is dev', () => {
		process.env.NODE_ENV = 'dev';
		const embed = newEmbed();
		const data = embed.toJSON();
		expect(data.footer?.text).toMatch(/- DEV$/);
	});
});

describe('truncateText', () => {
	it('returns original text when within limit', () => {
		expect(truncateText('hello', 10)).toBe('hello');
	});

	it('returns original when exactly at limit boundary', () => {
		// length <= limit-3 means no truncation; "abc" (3) <= 6-3 = 3
		expect(truncateText('abc', 6)).toBe('abc');
	});

	it('truncates and adds ellipsis when text exceeds limit', () => {
		const result = truncateText('abcdefghij', 8);
		expect(result).toMatch(/…$/);
		expect(result).toBe('abcde…');
	});

	it('handles exact truncation boundary', () => {
		// 'abcd' (4) > 7-3=4 is false, so no truncation
		expect(truncateText('abcd', 7)).toBe('abcd');
		// 'abcde' (5) > 7-3=4 is true, truncate
		const result = truncateText('abcde', 7);
		expect(result).toBe('abcd…');
	});
});

describe('colors', () => {
	const expectedKeys = [
		'helpCommand',
		'infoCommand',
		'pingCommand',
		'serverPingCommand',
		'serverIPCommand',
		'serverSeedCommand',
		'serverMapCommand',
		'serverWakeupCommand',
		'minesweeperCommand',
		'reactionRolesCommand',
		'tictactoeCommand',
		'valorantCommand',
		'configCommand',
		'success',
		'warn',
		'error'
	];

	it.each(expectedKeys)('has color key "%s"', (key) => {
		expect(colors).toHaveProperty(key);
		expect(typeof (colors as Record<string, number>)[key]).toBe('number');
	});
});
