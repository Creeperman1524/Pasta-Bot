jest.mock('../../src/logging', () => ({
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

const mockConnect = jest.fn().mockResolvedValue(undefined);
jest.mock('mongoose', () => ({
	Promise: global.Promise,
	set: jest.fn(),
	connect: mockConnect,
	connection: {
		once: jest.fn(),
		on: jest.fn()
	}
}));

import task from '../../src/tasks/databaseConnection';
import { logger } from '../../src/logging';

describe('databaseConnection task', () => {
	const origEnv = process.env.mongoDB;

	afterEach(() => {
		process.env.mongoDB = origEnv;
		jest.clearAllMocks();
	});

	it('calls mongoose.connect with the mongoDB env var', async () => {
		process.env.mongoDB = 'mongodb://localhost:27017/test';
		await task.execute();
		expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {});
	});

	it('logs an error and returns early when mongoDB env var is missing', async () => {
		delete process.env.mongoDB;
		const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
		(logger.child as jest.Mock).mockReturnValue(mockLog);

		await task.execute();

		expect(mockConnect).not.toHaveBeenCalled();
		expect(mockLog.error).toHaveBeenCalled();
	});
});
