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

import calendarModule from '../../src/status/calendarEvents';
import { Bot } from '../../src/util/types/bot';

describe('calendarEvents', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns days+hours format when event is more than a day away', async () => {
		// Set time to Jan 1 2026 noon — MLK Jr. Day is Jan 19
		jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
		const result = await calendarModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toMatch(/^\d+d \d+h - /);
	});

	it('returns hours+minutes format when event is within 24 hours', async () => {
		// MLK Jr. Day is Jan 19 2026 midnight — set to Jan 18 at 10pm (2h before)
		jest.setSystemTime(new Date(2026, 0, 18, 22, 0, 0));
		const result = await calendarModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toMatch(/^\d+h \d+m - /);
	});

	it('picks the first event occurring after now', async () => {
		// Set to Feb 3 2026 — Groundhog Day (Feb 2) has passed, next is Superbowl (Feb 8)
		jest.setSystemTime(new Date(2026, 1, 3, 12, 0, 0));
		const result = await calendarModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toContain('Superbowl');
	});

	it('returns a status update object with activity set', async () => {
		jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
		const result = await calendarModule.execute({} as unknown as Bot);
		expect(result).toHaveProperty('message');
		expect(result).toHaveProperty('activity');
	});
});
