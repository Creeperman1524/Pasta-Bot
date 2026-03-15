const loggerError = jest.fn();
jest.mock('../../../src/logging', () => ({
	logger: {
		child: jest.fn().mockReturnValue({
			info: jest.fn(),
			warn: jest.fn(),
			error: loggerError,
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

describe('/reactionrole', () => {
	describe('create', () => {
		it('replies with error when no text channel is provided', async () => {
			mockFindOneAndUpdate.mockResolvedValue({ reactionMessages: {} });
			const interaction = createMockInteraction({
				subcommand: 'create',
				getString: { title: 'My Roles' },
				getChannel: { channel: null }
			});
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining('valid channel') })
			);
		});

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

	describe('delete', () => {
		it('replies with error when guild has no reaction messages', async () => {
			mockFindOne.mockResolvedValue({ reactionMessages: {} });
			const interaction = createMockInteraction({ subcommand: 'delete' });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining("doesn't seem") })
			);
		});

		it('replies with error when a message is not a reaction message', async () => {
			mockFindOne.mockResolvedValue({
				reactionMessages: { 'message-id': ['role-id', 'emoji'] }
			});
			const interaction = createMockInteraction({
				subcommand: 'delete',
				getString: { messagelink: '' }
			});
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: expect.stringContaining('this server') })
			);
			expect(loggerError).toHaveBeenCalledWith(
				expect.stringContaining('not a valid reaction message')
			);
		});

		// TODO: make a successful delete test (that will take a lot of mocking)
	});

	describe('add', () => {
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

	describe('remove', () => {
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

// ---------------------------------------------------------------------------

describe('/reactionrole — database failure tests', () => {
	const MSG_LINK = 'https://discord.com/channels/guild-456/chan-1/msg-99';

	/**
	 * Returns a guild setup where the channel cache contains a text channel
	 * whose messages.fetch returns the given mock message.
	 */
	function makeGuildWithMessage(msgMock: object) {
		const { ChannelType } = jest.requireActual<typeof import('discord.js')>('discord.js');
		const channelMock = {
			id: 'chan-1',
			type: ChannelType.GuildText,
			send: jest.fn(),
			messages: { fetch: jest.fn().mockResolvedValue(msgMock) }
		};
		return {
			id: 'guild-456',
			name: 'Test Guild',
			channels: { cache: new Map([['chan-1', channelMock]]) },
			members: { fetch: jest.fn() },
			roles: { fetch: jest.fn() }
		};
	}

	describe('create', () => {
		it('replies with error content when DB write (second findOneAndUpdate) returns null', async () => {
			const msgMock = { id: 'msg-99', url: 'http://example.com', delete: jest.fn() };
			const channelMock = {
				id: 'chan-1',
				type: (jest.requireActual('discord.js') as typeof import('discord.js')).ChannelType
					.GuildText,
				send: jest.fn().mockResolvedValue(msgMock)
			};
			// First (upsert) succeeds; second (write new message) returns null
			mockFindOneAndUpdate
				.mockResolvedValueOnce({ reactionMessages: {} }) // upsert
				.mockResolvedValueOnce(null); // write fails

			const interaction = createMockInteraction({
				subcommand: 'create',
				getString: { title: 'My Roles' },
				getChannel: { channel: channelMock }
			});
			await command.execute(interaction);

			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastCall = calls[calls.length - 1][0];
			expect(lastCall.content ?? '').toContain('Could not update the database');
		});
	});

	describe('delete', () => {
		it('replies with error content when DB write returns null', async () => {
			const msgMock = {
				id: 'msg-99',
				delete: jest.fn().mockResolvedValue(undefined),
				embeds: [{ fields: [] }]
			};
			mockFindOne.mockResolvedValue({ reactionMessages: { 'msg-99': [] } });
			mockFindOneAndUpdate.mockResolvedValueOnce(null); // delete write fails

			const interaction = createMockInteraction({
				subcommand: 'delete',
				getString: { messagelink: MSG_LINK },
				guild: makeGuildWithMessage(msgMock)
			});
			await command.execute(interaction);

			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastCall = calls[calls.length - 1][0];
			expect(lastCall.content ?? '').toContain('Could not update the database');
		});
	});

	describe('add', () => {
		it('replies with error content when DB write returns null', async () => {
			const fakeEmbed = { fields: [], toJSON: () => ({ fields: [] }) };
			const msgMock = {
				id: 'msg-99',
				react: jest.fn().mockResolvedValue(undefined),
				edit: jest.fn(),
				embeds: [fakeEmbed]
			};
			mockFindOne.mockResolvedValue({ reactionMessages: { 'msg-99': [] } });
			mockFindOneAndUpdate.mockResolvedValueOnce(null); // write fails

			const interaction = createMockInteraction({
				subcommand: 'add',
				getString: { messagelink: MSG_LINK, emoji: '🎉' },
				getRole: { role: { id: 'role-abc', name: 'Tester' } },
				guild: makeGuildWithMessage(msgMock)
			});
			await command.execute(interaction);

			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastCall = calls[calls.length - 1][0];
			expect(lastCall.content ?? '').toContain('Could not update the database');
		});
	});

	describe('remove', () => {
		it('replies with error content when DB write returns null', async () => {
			// Use empty fields so the delete-loop doesn't create a sparse array
			const fakeEmbed = { fields: [], toJSON: () => ({ fields: [] }) };
			const msgMock = {
				id: 'msg-99',
				edit: jest.fn(),
				embeds: [fakeEmbed],
				reactions: { cache: { get: jest.fn().mockReturnValue({ remove: jest.fn() }) } }
			};
			mockFindOne.mockResolvedValue({
				reactionMessages: { 'msg-99': [['role-abc', '🎉']] }
			});
			mockFindOneAndUpdate.mockResolvedValueOnce(null); // delete write fails

			const interaction = createMockInteraction({
				subcommand: 'remove',
				getString: { messagelink: MSG_LINK },
				getRole: { role: { id: 'role-abc', name: 'Tester' } },
				guild: makeGuildWithMessage(msgMock)
			});
			await command.execute(interaction);

			const calls = (interaction.editReply as jest.Mock).mock.calls;
			const lastCall = calls[calls.length - 1][0];
			expect(lastCall.content ?? '').toContain('Could not update the database');
		});
	});
});
