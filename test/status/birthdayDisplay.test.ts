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

import birthdayModule from '../../src/status/birthdayDisplay';
import { Bot } from '../../src/util/types/bot';

describe('birthdayDisplay', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns days+hours format when birthday is multiple days away', async () => {
		// Anthony's birthday is Jan 26 — set time to Jan 1 at noon
		jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
		const result = await birthdayModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toMatch(/^\d+d \d+h 🎂/);
	});

	it('returns hours+minutes format when birthday is within 24 hours', async () => {
		// Set to Jan 25 at 8pm (Anthony Jan 26) — ~28h away, but let's use a close one
		// Set to Jan 25 at 8pm — Anthony Jan 26 is ~28h away; use Jan 26 at 1am — ~18h to end of day
		jest.setSystemTime(new Date(2026, 0, 25, 23, 30, 0)); // Jan 25 11:30pm -> 30m until Jan 26
		const result = await birthdayModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toMatch(/^\d+h \d+m 🎂/);
	});

	it('returns happy birthday message on the birthday before 7pm', async () => {
		// Jan 26 at 10am (Anthony's birthday)
		jest.setSystemTime(new Date(2026, 0, 26, 10, 0, 0));
		const result = await birthdayModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		expect(result.message).toMatch(/🎂 Happy birthday/);
	});

	it('skips birthday that already passed today (after 7pm) and shows next', async () => {
		// Jan 26 at 8pm — Anthony's birthday has passed, next is Ravi on Feb 1
		jest.setSystemTime(new Date(2026, 0, 26, 20, 0, 0));
		const result = await birthdayModule.execute({} as unknown as Bot);
		expect(result).toBeDefined();
		// Should show next birthday, not Anthony's
		expect(result.message).not.toContain('Anthony');
	});

	it('returns a status update object with activity set', async () => {
		jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
		const result = await birthdayModule.execute({} as unknown as Bot);
		expect(result).toHaveProperty('message');
		expect(result).toHaveProperty('activity');
	});
});
