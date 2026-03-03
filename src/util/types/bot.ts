import { Client, Collection } from 'discord.js';
import { Command } from './command';

export interface Bot extends Client<true> {
	commands: Collection<string, Command>;
}
