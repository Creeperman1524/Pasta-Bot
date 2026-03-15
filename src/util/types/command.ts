import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	SlashCommandBuilder
} from 'discord.js';
import { Bot } from './bot';

// Modifies the default types so they can see the client.commands and other properties
export interface ModChatInputCommandInteraction extends ChatInputCommandInteraction {
	client: Bot;
}

export interface ModAutocompleteInteraction extends AutocompleteInteraction {
	client: Bot;
}

export type CommandExecute = (interaction: ModChatInputCommandInteraction) => Promise<void>;

export type CommandAutocomplete = (interaction: ModAutocompleteInteraction) => Promise<void>;

export interface Command {
	data: SlashCommandBuilder;
	category: string;

	execute: CommandExecute;
	autocomplete?: CommandAutocomplete;
}
