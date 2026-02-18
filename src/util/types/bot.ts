import { Client, Collection } from 'discord.js';

export interface Bot extends Client {
	commands: Collection<string, any>;
}
