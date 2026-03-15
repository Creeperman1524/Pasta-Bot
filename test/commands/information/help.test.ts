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
		data: new SlashCommandBuilder()
			.setName(name)
			.setDescription('test')
			.addSubcommand((subcommand) =>
				subcommand.setName('pong').setDescription('pongs the server')
			) as SlashCommandBuilder,
		category: 'test',
		execute: jest.fn()
	};
}

import command from '../../../src/commands/information/help';

describe('/help', () => {
	describe('execute', () => {
		describe('general help', () => {
			it('calls paginate when no command option is provided', async () => {
				const cmds = [makeCommand('ping'), makeCommand('info')];
				const interaction = createMockInteraction({ getString: { command: null } });
				// Populate client.commands after creation
				cmds.forEach((c) => interaction.client.commands.set(c.data.name, c));
				await command.execute(interaction);
				expect(paginate).toHaveBeenCalled();
			});
		});

		describe('detailed help', () => {
			it('replies with error when command does not exist', async () => {
				const interaction = createMockInteraction({
					getString: { command: 'nonexistent' }
				});
				await command.execute(interaction);
				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];
				expect(embed?.toJSON().description).toContain('not a valid command');
			});

			it('returns the details of the command when a proper commnand is supplied', async () => {
				const cmds = [makeCommand('ping')];
				const interaction = createMockInteraction({ getString: { command: 'ping' } });
				cmds.forEach((c) => interaction.client.commands.set(c.data.name, c));

				await command.execute(interaction);
				const embed = (interaction.editReply as jest.Mock).mock.calls[0][0].embeds?.[0];

				expect(embed?.toJSON().title).toContain('ping'); // Contains the name of the command
				expect(embed?.toJSON().description).toContain('test'); // Contains the category
				expect(embed?.toJSON().fields[0].name).toContain('pong'); // the subcommand name
				expect(embed?.toJSON().fields[0].value).toContain('pongs the server'); // the subcommand description
			});
		});
	});

	describe('autocomplete', () => {
		it('responds with all command names when query is empty', async () => {
			const cmds = [makeCommand('ping'), makeCommand('help'), makeCommand('info')];
			const interaction = createMockAutocompleteInteraction({ focused: '', commands: cmds });

			if (!command.autocomplete) fail('autocomplete function is missing');

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
