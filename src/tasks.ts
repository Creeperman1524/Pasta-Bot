import { logger } from './logging';
import fs from 'fs';
import { Bot } from './util/types/bot.js';
import { Task } from './util/types/task.js';

const tasks: Task[] = [];
const taskFiles = fs.readdirSync('./src/tasks');

// Gather tasks from folder
(async () => {
	for (const file of taskFiles) {
		const task = await import(`./tasks/${file.slice(0, -3)}`);
		tasks.push(task.default as Task);
	}
})();

// Runs the tasks
export default async (client: Bot) => {
	logger.child({ mode: 'TASKS' }).info('Started running tasks...');

	const onceTasks = tasks
		.filter((task) => task.mode === 'ONCE')
		.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	const recurringTasks = tasks.filter((task) => task.mode !== 'ONCE');

	// Run all ONCE tasks in priority order
	for (const task of onceTasks) {
		logger
			.child({ mode: 'TASKS' })
			.debug(
				`Running '${task.name}' in mode '${task.mode}' with priority '${task.priority ?? 0}'`
			);
		await task.execute(client);
	}

	// Initialize all recurring tasks
	for (const task of recurringTasks) {
		logger.child({ mode: 'TASKS' }).debug(`Running '${task.name}' in mode '${task.mode}'`);
		if (task.mode == 'INTERVAL') {
			// Set the interval in seconds, or defaults to 30 seconds
			void task.execute(client);
			setInterval(
				() => {
					void task.execute(client);
				},
				task.interval * 1000 || 30000
			);
			continue;
		}

		if (task.mode == 'TIME') {
			// Runs the task at a specified time, or defaults to midnight
			runAtSpecificTimeOfDay(task.timeHour || 0, task.timeMinutes || 0, task.execute, client);
		}
	}

	logger.child({ mode: 'TASKS' }).info('Tasks have been initialized');
};

// Thanks to Farhad Taran at https://gist.github.com/farhad-taran/f487a07c16fd53ee08a12a90cdaea082
function runAtSpecificTimeOfDay(
	hour: number,
	minutes: number,
	func: (client: Bot) => void,
	client: Bot
) {
	const twentyFourHours = 86400000;
	const now = new Date();
	let eta_ms =
		new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0, 0).getTime() -
		now.getTime();
	if (eta_ms < 0) {
		eta_ms += twentyFourHours;
	}
	setTimeout(function () {
		// Run once on bot startup at the next time
		func(client);

		// Run every 24 hours from then
		setInterval(func, twentyFourHours, client);
	}, eta_ms);
}
