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

// Mock discord.js createMessageComponentCollector & msg.edit
const mockCollectorOn = jest.fn();
const mockCollectorStop = jest.fn();
const mockMsgEdit = jest.fn().mockResolvedValue({});
const mockFollowUp = jest.fn().mockResolvedValue({
	createMessageComponentCollector: jest.fn().mockReturnValue({
		on: mockCollectorOn,
		stop: mockCollectorStop
	}),
	edit: mockMsgEdit
});

import { EmbedBuilder, CommandInteraction } from 'discord.js';
import { paginate } from '../../src/util/pagination';

function makeInteraction(replied = true) {
	return {
		replied,
		deferred: false,
		user: { id: 'u1' },
		followUp: mockFollowUp,
		reply: jest.fn().mockResolvedValue({
			createMessageComponentCollector: jest.fn().mockReturnValue({ on: mockCollectorOn }),
			edit: mockMsgEdit
		}),
		editReply: jest.fn().mockResolvedValue({ content: 'err' })
	} as unknown as CommandInteraction;
}

function makePages(n: number) {
	return Array.from({ length: n }, (_, i) => new EmbedBuilder().setTitle(`Page ${i + 1}`));
}

describe('paginate()', () => {
	it('calls editReply with error when pages array is empty', async () => {
		const interaction = makeInteraction();
		await paginate(interaction, [], 30000);
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.any(String) })
		);
	});

	it('calls editReply with error when time is too short', async () => {
		const interaction = makeInteraction();
		await paginate(interaction, makePages(2), 5000);
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.any(String) })
		);
	});

	it('sends the first page on initial call', async () => {
		const interaction = makeInteraction(true);
		const pages = makePages(3);
		await paginate(interaction, pages, 30000);
		expect(mockFollowUp).toHaveBeenCalledWith(expect.objectContaining({ embeds: [pages[0]] }));
	});

	it('registers collect and end handlers on collector', async () => {
		const interaction = makeInteraction(true);
		const pages = makePages(3);
		await paginate(interaction, pages, 30000);
		const calls = (mockCollectorOn.mock.calls as [string, unknown][]).map((c) => c[0]);
		expect(calls).toContain('collect');
		expect(calls).toContain('end');
	});

	it('removes components when the end event fires', async () => {
		const interaction = makeInteraction(true);
		const pages = makePages(2);
		await paginate(interaction, pages, 30000);
		// Find the 'end' event handler and invoke it to verify cleanup
		const endCall = (mockCollectorOn.mock.calls as [string, () => void][]).find(
			(c) => c[0] === 'end'
		);
		expect(endCall).toBeDefined();
		await endCall![1]();
		expect(mockMsgEdit).toHaveBeenCalledWith({ components: [] });
	});
});
