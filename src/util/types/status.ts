import { PresenceUpdateStatus } from 'discord.js';
import { Bot } from './bot';

export type StatusRecord = Record<string, StatusUpdate>;

export interface StatusUpdate {
	message: string;
	activity: PresenceUpdateStatus;
}

export type StatusExecute = (client: Bot) => Promise<StatusUpdate>;

export interface Status {
	name: string | 'displayServer';
	execute: StatusExecute;
}
