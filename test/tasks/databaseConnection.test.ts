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
import { Bot } from '../../src/util/types/bot';

describe('databaseConnection task', () => {
	const origEnv = process.env.mongoDB;
	const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
		throw new Error('process.exit');
	}) as never);
	const setTimeoutSpy = jest
		.spyOn(global, 'setTimeout')
		.mockImplementation((cb: TimerHandler) => {
			if (typeof cb == 'function') cb();
			return 0 as never;
		});

	afterEach(() => {
		process.env.mongoDB = origEnv;
		jest.clearAllMocks();
	});

	afterAll(() => {
		processExitSpy.mockRestore();
		setTimeoutSpy.mockRestore();
	});

	it('calls mongoose.connect with the mongoDB env var', async () => {
		process.env.mongoDB = 'mongodb://localhost:27017/test';
		await task.execute({} as unknown as Bot);
		expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {});
	});

	it('logs an error and exits when mongoDB env var is missing', async () => {
		delete process.env.mongoDB;
		const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
		(logger.child as jest.Mock).mockReturnValue(mockLog);

		await expect(task.execute({} as unknown as Bot)).rejects.toThrow('process.exit');

		expect(mockConnect).not.toHaveBeenCalled();
		expect(mockLog.error).toHaveBeenCalled();
		expect(processExitSpy).toHaveBeenCalledWith(1);
	});

	it('retries and eventually succeeds', async () => {
		process.env.mongoDB = 'mongodb://localhost:27017/test';
		mockConnect
			.mockRejectedValueOnce(new Error('attempt1'))
			.mockRejectedValueOnce(new Error('attempt2'))
			.mockResolvedValueOnce(undefined);

		await task.execute({} as unknown as Bot);

		expect(mockConnect).toHaveBeenCalledTimes(3);
	});

	it('exits after max retry attempts', async () => {
		process.env.mongoDB = 'mongodb://localhost:27017/test';
		mockConnect.mockRejectedValue(new Error('bad connection'));

		await expect(task.execute({} as unknown as Bot)).rejects.toThrow('process.exit');

		expect(mockConnect).toHaveBeenCalledTimes(5);
		expect(processExitSpy).toHaveBeenCalledWith(1);
	});
});
