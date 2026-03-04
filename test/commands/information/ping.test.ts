jest.mock('../../../src/logging', () => ({
	logger: {
		child: jest.fn().mockReturnValue({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		})
	}
}));

import { createMockInteraction } from '../../helpers/mockInteraction';

import command from '../../../src/commands/information/ping';

describe('/ping command', () => {
	it('calls editReply with an embed', async () => {
		const interaction = createMockInteraction({ clientWsPing: 55 });
		await command.execute(interaction);
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ embeds: expect.any(Array) })
		);
	});

	it('embed title is "Ping"', async () => {
		const interaction = createMockInteraction();
		await command.execute(interaction);
		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		expect(embeds[0].toJSON().title).toBe('Ping');
	});

	it('embed includes Roundtrip Latency field', async () => {
		const ts = Date.now() - 123;
		const interaction = createMockInteraction({ createdTimestamp: ts });
		await command.execute(interaction);
		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		const fields: { name: string; value: string }[] = embeds[0].toJSON().fields ?? [];
		const latency = fields.find((f) => f.name === 'Roundtrip Latency');
		expect(latency).toBeDefined();
		expect(latency?.value).toMatch(/ms/);
	});

	it('embed includes Websocket Heartbeat field using client.ws.ping', async () => {
		const interaction = createMockInteraction({ clientWsPing: 77 });
		await command.execute(interaction);
		const [[{ embeds }]] = (interaction.editReply as jest.Mock).mock.calls;
		const fields: { name: string; value: string }[] = embeds[0].toJSON().fields ?? [];
		const ws = fields.find((f) => f.name === 'Websocket Heartbeat');
		expect(ws).toBeDefined();
		expect(ws?.value).toContain('77');
	});
});
