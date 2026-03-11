import {
	ModChatInputCommandInteraction,
	ModAutocompleteInteraction
} from '../../src/util/types/command';
import { createMockClient } from './mockClient';
import { EmbedBuilder } from 'discord.js';
import { createMockMessage } from './mockMessage';

interface InteractionOverrides {
	subcommand?: string;
	getString?: Record<string, string | null>;
	getBoolean?: Record<string, boolean | null>;
	getRole?: Record<string, object | null>;
	getChannel?: Record<string, object | null>;
	getUser?: Record<string, object | null>;
	getInteger?: Record<string, number | null>;
	user?: Partial<{ id: string; username: string }>;
	guild?: Partial<{
		id: string;
		name: string;
		channels: { cache: Map<string, unknown> };
		members: { fetch: jest.Mock };
		roles: { fetch: jest.Mock };
	}>;
	guildId?: string;
	createdTimestamp?: number;
	clientWsPing?: number;
	guildSize?: number;
	/**
	 * When true, `editReply` resolves with a MockMessage whose `embeds` are
	 * dynamically captured from the call arguments. This allows game code that
	 * does `game.embed = await editReply(...)` and later reads
	 * `game.embed.embeds[0]` / calls `game.embed.createMessageComponentCollector`
	 * to work correctly in integration tests.
	 */
	useMockMessage?: boolean;
}

export function createMockInteraction(
	overrides: InteractionOverrides = {}
): jest.Mocked<ModChatInputCommandInteraction> {
	const client = createMockClient();
	(client.ws as { ping: number }).ping = overrides.clientWsPing ?? 42;
	(client.guilds.cache as Map<string, unknown>).set('g1', {});
	if (overrides.guildSize !== undefined) {
		// repopulate so .size is correct
		(client.guilds.cache as unknown as Map<string, unknown>).clear();
		for (let i = 0; i < overrides.guildSize; i++) {
			(client.guilds.cache as unknown as Map<string, unknown>).set(`g${i}`, {});
		}
	}

	const defaultUser = { id: 'user-123', username: 'testuser', ...overrides.user };
	const defaultGuild = {
		id: 'guild-456',
		name: 'Test Guild',
		channels: { cache: new Map() },
		members: { fetch: jest.fn() },
		roles: { fetch: jest.fn() },
		...overrides.guild
	};

	// When useMockMessage is set, editReply resolves with a MockMessage so that
	// game code reading game.embed.embeds[0] and calling
	// game.embed.createMessageComponentCollector() works in integration tests.
	const editReplyMock = overrides.useMockMessage
		? jest.fn().mockImplementation(async (reply: { embeds?: EmbedBuilder[] }) => {
				const embeds = reply?.embeds ?? [new EmbedBuilder()];
				return createMockMessage(embeds);
			})
		: jest.fn().mockResolvedValue({});

	return {
		editReply: editReplyMock,
		followUp: jest.fn().mockResolvedValue({}),
		reply: jest.fn().mockResolvedValue({}),
		deferReply: jest.fn().mockResolvedValue({}),
		replied: false,
		deferred: true,
		createdTimestamp: overrides.createdTimestamp ?? Date.now() - 100,
		user: defaultUser,
		guild: defaultGuild,
		guildId: overrides.guildId ?? defaultGuild.id,
		client,
		options: {
			getSubcommand: jest.fn().mockReturnValue(overrides.subcommand ?? null),
			getString: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getString ?? {};
				return key in map ? map[key] : null;
			}),
			getBoolean: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getBoolean ?? {};
				return key in map ? map[key] : null;
			}),
			getRole: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getRole ?? {};
				return key in map ? map[key] : null;
			}),
			getChannel: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getChannel ?? {};
				return key in map ? map[key] : null;
			}),
			getUser: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getUser ?? {};
				return key in map ? map[key] : null;
			}),
			getInteger: jest.fn().mockImplementation((key: string) => {
				const map = overrides.getInteger ?? {};
				return key in map ? map[key] : null;
			}),
			getFocused: jest.fn().mockReturnValue('')
		}
	} as unknown as jest.Mocked<ModChatInputCommandInteraction>;
}

export function createMockAutocompleteInteraction(
	overrides: {
		focused?: string;
		commands?: import('../../src/util/types/command').Command[];
	} = {}
): jest.Mocked<ModAutocompleteInteraction> {
	const client = createMockClient(overrides.commands ?? []);
	return {
		client,
		user: { id: 'user-123', username: 'testuser' },
		guild: { id: 'guild-456', name: 'Test Guild' },
		guildId: 'guild-456',
		commandName: 'test',
		commandId: 'cmd-id',
		respond: jest.fn().mockResolvedValue(undefined),
		options: {
			getFocused: jest.fn().mockReturnValue(overrides.focused ?? '')
		}
	} as unknown as jest.Mocked<ModAutocompleteInteraction>;
}
