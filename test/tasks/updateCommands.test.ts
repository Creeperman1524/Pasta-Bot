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

const mockBotFind = jest.fn();
const mockBotCreate = jest.fn();
const mockBotUpdate = jest.fn();
jest.mock('../../src/schemas/botConfigs.schema', () => ({
	__esModule: true,
	default: {
		findOne: mockBotFind,
		create: mockBotCreate,
		findOneAndUpdate: mockBotUpdate
	}
}));

const mockDeployExecute = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/deploy-commands', () => ({
	__esModule: true,
	default: { execute: mockDeployExecute }
}));

jest.mock('../../src/util/database', () => ({
	__esModule: true,
	default: { writeToDatabase: jest.fn() }
}));

import task from '../../src/tasks/updateCommands';
import { Bot } from '../../src/util/types/bot';
import { logger } from '../../src/logging';

describe('updateCommands task', () => {
	beforeEach(() => {
		process.env.clientID = 'bot-client-id';
		jest.clearAllMocks();
	});

	it('creates a new bot config and returns when none exists', async () => {
		mockBotFind.mockResolvedValue(null);
		mockBotCreate.mockResolvedValue({ id: 'new-doc', save: jest.fn() });

		await task.execute({} as unknown as Bot);

		expect(mockBotCreate).toHaveBeenCalledWith(
			expect.objectContaining({ botID: 'bot-client-id' })
		);
		expect(mockDeployExecute).not.toHaveBeenCalled();
	});

	it('calls deployCommands when commandsLastUpdated is in the past', async () => {
		const pastTime = (Date.now() - 1000).toString();
		mockBotFind.mockResolvedValue({ commandsLastUpdated: pastTime });
		const updatedDoc = { save: jest.fn() };
		mockBotUpdate.mockResolvedValue(updatedDoc);

		await task.execute({} as unknown as Bot);

		expect(mockDeployExecute).toHaveBeenCalledTimes(1);
	});

	it('skips deploy and logs countdown when commandsLastUpdated is in the future', async () => {
		const futureTime = (Date.now() + 60 * 60 * 1000).toString(); // 1 hour from now
		mockBotFind.mockResolvedValue({ commandsLastUpdated: futureTime });
		const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
		(logger.child as jest.Mock).mockReturnValue(mockLog);

		await task.execute({} as unknown as Bot);

		expect(mockDeployExecute).not.toHaveBeenCalled();
		expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('minutes'));
	});
});
