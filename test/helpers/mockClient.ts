import { Collection } from 'discord.js';
import { Bot } from '../../src/util/types/bot';
import { Command } from '../../src/util/types/command';

export function createMockClient(commands: Command[] = []): jest.Mocked<Bot> {
	const col = new Collection<string, Command>();
	commands.forEach((cmd) => col.set(cmd.data.name, cmd));

	return {
		commands: col,
		guilds: {
			cache: new Collection(),
			fetch: jest.fn()
		},
		ws: { ping: 42 },
		user: { id: 'bot-id', setPresence: jest.fn() }
	} as unknown as jest.Mocked<Bot>;
}
