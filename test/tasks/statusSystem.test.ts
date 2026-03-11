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

// Mock fs.readdirSync to return fake status files
jest.mock('fs', () => ({
	readdirSync: jest
		.fn()
		.mockReturnValue(['birthdayDisplay.ts', 'calendarEvents.ts', 'displayServer.ts'])
}));

import { PresenceUpdateStatus } from 'discord.js';

// Define fake status responses
const birthdayStatus = { message: 'birthday msg', activity: PresenceUpdateStatus.Idle };
const calendarStatus = { message: 'calendar msg', activity: PresenceUpdateStatus.Idle };
const serverOnlineStatus = {
	message: '2/20 players - Alice',
	activity: PresenceUpdateStatus.Online
};

const mockBirthdayExec = jest.fn().mockResolvedValue(birthdayStatus);
const mockCalendarExec = jest.fn().mockResolvedValue(calendarStatus);
const mockDisplayExec = jest.fn().mockResolvedValue(serverOnlineStatus);

// Mock dynamic imports inside the status system
jest.mock(
	'../../src/status/birthdayDisplay',
	() => ({ name: 'birthdayDisplay', execute: mockBirthdayExec }),
	{ virtual: true }
);
jest.mock(
	'../../src/status/calendarEvents',
	() => ({ name: 'calendarEvents', execute: mockCalendarExec }),
	{ virtual: true }
);
jest.mock(
	'../../src/status/displayServer',
	() => ({ name: 'displayServer', execute: mockDisplayExec }),
	{ virtual: true }
);

import task from '../../src/tasks/statusSystem';

describe('statusSystem task', () => {
	it('is defined as an INTERVAL task', () => {
		expect(task.mode).toBe('INTERVAL');
		expect(typeof task.interval).toBe('number');
		expect(typeof task.execute).toBe('function');
	});

	it('has a positive interval value', () => {
		expect(task.interval).toBeGreaterThan(0);
	});
});
