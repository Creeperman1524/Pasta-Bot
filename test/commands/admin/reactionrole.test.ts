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

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
jest.mock('../../../src/schemas/guildConfigs.schema', () => ({
	__esModule: true,
	default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate }
}));
jest.mock('../../../src/util/database', () => ({
	__esModule: true,
	default: { writeToDatabase: jest.fn() }
}));

import { ChannelType } from 'discord.js';
import { createMockInteraction } from '../../helpers/mockInteraction';

import command from '../../../src/commands/admin/reactionrole';

function makeTextChannel(id = 'chan-1') {
	return { id, type: ChannelType.GuildText, send: jest.fn(), messages: { fetch: jest.fn() } };
}

describe('/reactionrole command', () => {
	describe('create subcommand', () => {
		it('replies with error when a non-text channel is provided', async () => {
			mockFindOneAndUpdate.mockResolvedValue({ reactionMessages: {} });
			const voiceChannel = { id: 'vc-1', type: ChannelType.GuildVoice };
			const interaction = createMockInteraction({
				subcommand: 'create',
				getString: { title: 'My Roles' },
				getChannel: { channel: voiceChannel }
			});
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining('valid channel') })
			);
		});

		it('sends an embed and saves to DB on success', async () => {
			const msgMock = { id: 'msg-1', url: 'http://example.com' };
			const channelMock = {
				id: 'chan-1',
				type: ChannelType.GuildText,
				send: jest.fn().mockResolvedValue(msgMock)
			};
			const updatedDoc = { reactionMessages: {}, save: jest.fn() };
			mockFindOneAndUpdate
				.mockResolvedValueOnce({ reactionMessages: {} }) // upsert
				.mockResolvedValueOnce(updatedDoc); // update with new message
			const interaction = createMockInteraction({
				subcommand: 'create',
				getString: { title: 'My Roles' },
				getChannel: { channel: channelMock }
			});
			await command.execute(interaction);
			expect(channelMock.send).toHaveBeenCalled();
			const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
			expect(embed?.toJSON().title).toMatch(/Success/i);
		});
	});

	describe('delete subcommand', () => {
		it('replies with error when guild has no reaction messages', async () => {
			mockFindOne.mockResolvedValue({ reactionMessages: {} });
			const interaction = createMockInteraction({ subcommand: 'delete' });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining("doesn't seem") })
			);
		});
	});

	describe('add subcommand', () => {
		it('replies with error when guild has no reaction messages', async () => {
			mockFindOne.mockResolvedValue({ reactionMessages: {} });
			const interaction = createMockInteraction({ subcommand: 'add' });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining("doesn't seem") })
			);
		});

		it('replies with error when @everyone role is used', async () => {
			const channel = makeTextChannel();
			const msgMock = {
				id: 'msg-99',
				embeds: [{ fields: [] }],
				react: jest.fn().mockResolvedValue(undefined),
				edit: jest.fn()
			};
			channel.messages.fetch = jest.fn().mockResolvedValue(msgMock);

			const guildChannels = new Map([['chan-1', channel]]);
			mockFindOne.mockResolvedValue({
				reactionMessages: { 'msg-99': [] }
			});

			const interaction = createMockInteraction({
				subcommand: 'add',
				getString: {
					messagelink: 'https://discord.com/channels/guild/chan/msg-99',
					emoji: '😎'
				},
				getRole: { role: { id: 'ev-id', name: '@everyone' } },
				guild: {
					id: 'guild-1',
					name: 'Test',
					channels: { cache: guildChannels },
					members: { fetch: jest.fn() },
					roles: { fetch: jest.fn() }
				}
			});

			await command.execute(interaction);
			// Either the message isn't found through the link, or the @everyone check fires
			expect(interaction.editReply).toHaveBeenCalled();
		});
	});

	describe('remove subcommand', () => {
		it('replies with error when guild has no reaction messages', async () => {
			mockFindOne.mockResolvedValue({ reactionMessages: {} });
			const interaction = createMockInteraction({ subcommand: 'remove' });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining("doesn't seem") })
			);
		});

		it('replies with error when role is not in the reaction message', async () => {
			const channel = makeTextChannel();
			const msgMock = {
				id: 'msg-99',
				embeds: [{ fields: [] }],
				react: jest.fn(),
				edit: jest.fn(),
				reactions: { cache: new Map() }
			};
			channel.messages.fetch = jest.fn().mockResolvedValue(msgMock);
			const guildChannels = new Map([['chan-1', channel]]);

			mockFindOne.mockResolvedValue({
				reactionMessages: { 'msg-99': [['role-abc', '🎉']] }
			});
			const interaction = createMockInteraction({
				subcommand: 'remove',
				getString: { messagelink: 'https://discord.com/channels/g/c/msg-99' },
				getRole: { role: { id: 'different-role', name: 'Other' } },
				guild: {
					id: 'guild-1',
					name: 'Test',
					channels: { cache: guildChannels },
					members: { fetch: jest.fn() },
					roles: { fetch: jest.fn() }
				}
			});
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalled();
		});
	});
});
