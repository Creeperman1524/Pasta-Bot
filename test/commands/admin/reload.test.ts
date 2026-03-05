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

import command from '../../../src/commands/admin/reload';

describe('/reload', () => {
	describe('execute', () => {
		it('replies with the discontinued message', async () => {
			const interaction = createMockInteraction();
			await command.execute(interaction);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.stringContaining('discontinued')
			);
		});
	});

	describe('autocomplete', () => {
		it('responds with all command names when query is empty', async () => {
			const cmds = [makeCommand('ping'), makeCommand('info')];
			const interaction = createMockAutocompleteInteraction({ focused: '', commands: cmds });

			if (!command.autocomplete) fail('autocomplete function is missing');

			await command.autocomplete(interaction);
			const [choices] = (interaction.respond as jest.Mock).mock.calls;
			const names = choices[0].map((c: { name: string }) => c.name);
			expect(names).toContain('ping');
			expect(names).toContain('info');
		});

		it('filters command names by focused prefix', async () => {
			const cmds = [makeCommand('ping'), makeCommand('pineapple'), makeCommand('info')];
			const interaction = createMockAutocompleteInteraction({
				focused: 'pi',
				commands: cmds
			});

			if (!command.autocomplete) fail('autocomplete function is missing');

			await command.autocomplete(interaction);
			const [choices] = (interaction.respond as jest.Mock).mock.calls;
			const names = choices[0].map((c: { name: string }) => c.name);
			expect(names).toContain('ping');
			expect(names).toContain('pineapple');
			expect(names).not.toContain('info');
		});
	});
});
