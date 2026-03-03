jest.mock('../../../src/logging', () => ({
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

jest.mock('../../../src/util/pagination', () => ({
	paginate: jest.fn().mockResolvedValue(undefined)
}));

import { paginate } from '../../../src/util/pagination';
import {
	createMockInteraction,
	createMockAutocompleteInteraction
} from '../../helpers/mockInteraction';
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../src/util/types/command';

function makeCommand(name: string): Command {
	return {
		data: new SlashCommandBuilder().setName(name).setDescription('test'),
		category: 'test',
		execute: jest.fn()
	};
}

import command from '../../../src/commands/information/help';

describe('/help command', () => {
	describe('execute() — general help (no command option)', () => {
		it('calls paginate when no command option is provided', async () => {
			const cmds = [makeCommand('ping'), makeCommand('info')];
			const interaction = createMockInteraction({ getString: { command: null } });
			// Populate client.commands after creation
			cmds.forEach((c) => interaction.client.commands.set(c.data.name, c));
			await command.execute(interaction);
			expect(paginate).toHaveBeenCalled();
		});
	});

	describe('execute() — detailed help (specific command)', () => {
		it('calls editReply when a command name is supplied', async () => {
			const cmds = [makeCommand('ping')];
			const interaction = createMockInteraction({ getString: { command: 'ping' } });
			cmds.forEach((c) => interaction.client.commands.set(c.data.name, c));
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalled();
		});

		it('calls editReply with error embed for unknown command', async () => {
			const interaction = createMockInteraction({ getString: { command: 'nonexistent' } });
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalled();
		});
	});

	describe('autocomplete()', () => {
		it('responds with all command names when query is empty', async () => {
			const cmds = [makeCommand('ping'), makeCommand('help'), makeCommand('info')];
			const interaction = createMockAutocompleteInteraction({ focused: '', commands: cmds });
			await command.autocomplete(interaction);
			const [choices] = (interaction.respond as jest.Mock).mock.calls;
			const names = choices[0].map((c: { name: string }) => c.name);
			expect(names).toContain('ping');
			expect(names).toContain('help');
			expect(names).toContain('info');
		});

		it('filters command names by prefix', async () => {
			const cmds = [makeCommand('ping'), makeCommand('pineapple'), makeCommand('info')];
			const interaction = createMockAutocompleteInteraction({
				focused: 'pi',
				commands: cmds
			});
			await command.autocomplete(interaction);
			const [choices] = (interaction.respond as jest.Mock).mock.calls;
			const names = choices[0].map((c: { name: string }) => c.name);
			expect(names).toContain('ping');
			expect(names).toContain('pineapple');
			expect(names).not.toContain('info');
		});
	});
});
