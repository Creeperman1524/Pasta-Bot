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

import { HydratedDocument } from 'mongoose';
import database from '../../src/util/database';
import { logger } from '../../src/logging';

// A minimal structural type for the Mongoose document mock.
// writeToDatabase only calls .save() and reads .id, .guildID, .userID.
function makeDoc(fields: Record<string, unknown>): HydratedDocument<Record<string, unknown>> {
	return { id: 'doc-id', save: jest.fn(), ...fields } as unknown as HydratedDocument<
		Record<string, unknown>
	>;
}

describe('database.writeToDatabase()', () => {
	it('calls schema.save()', () => {
		const doc = makeDoc({ guildID: 'g1' });
		database.writeToDatabase(doc, 'TEST_TYPE');
		expect(doc.save).toHaveBeenCalledTimes(1);
	});

	it('logs with mode DATABASE and the correct type string', () => {
		const mockLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
		(logger.child as jest.Mock).mockReturnValue(mockLog);

		const doc = makeDoc({ userID: 'u1' });
		database.writeToDatabase(doc, 'MY_TYPE');

		expect(logger.child).toHaveBeenCalledWith(expect.objectContaining({ mode: 'DATABASE' }));
		expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('MY_TYPE'));
	});
});
