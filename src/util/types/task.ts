import { Bot } from './bot';

export type TaskExecute = (client: Bot) => void | Promise<void>;

export interface BaseTask {
	name: string;
	mode: 'ONCE' | 'INTERVAL' | 'TIME';
	execute: TaskExecute;
}

export interface TaskOnce extends BaseTask {
	mode: 'ONCE';
	priority?: number;
}
export interface TaskInterval extends BaseTask {
	mode: 'INTERVAL';
	interval: number;
}
export interface TaskTime extends BaseTask {
	mode: 'TIME';
	timeHour: number;
	timeMinutes: number;
}

export type Task = TaskOnce | TaskInterval | TaskTime;
