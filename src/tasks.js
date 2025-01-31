const { logger } = require('./logging.js');
const fs = require('fs');

const tasks = [];
const taskFiles = fs.readdirSync('./src/tasks');

// Gather tasks from folder
for (const file of taskFiles) {
	const task = require(`./tasks/${file}`);
	tasks.push(task);
}

// Runs the tasks
const runTasks = async (client) => {
	logger.child({ mode: 'TASKS' }).info('Started running tasks...');

	// Runs all tasks
	for (const task of tasks) {
		logger.child({ mode: 'TASKS' }).debug(`Running '${task.name}' in mode '${task.mode}'`);
		switch (task.mode) {
			case 'ONCE':
				await task.execute(client);
				break;

			case 'INTERVAL':
			// Set the interval in seconds, or defaults to 30 seconds
				task.execute(client);
				setInterval(task.execute, task.interval * 1000 || 30000, client);
				break;
			case 'TIME':
			// Runs the task at a specified time, or defaults to midnight
				runAtSpecificTimeOfDay(task.timeHour || 0, task.timeMinutes || 0, task.execute, client);
				break;
		}
	}

	logger.child({ mode: 'TASKS' }).info('Tasks have been initialized');

};

// Thanks to Farhad Taran at https://gist.github.com/farhad-taran/f487a07c16fd53ee08a12a90cdaea082
function runAtSpecificTimeOfDay(hour, minutes, func, client) {
	const twentyFourHours = 86400000;
	const now = new Date();
	let eta_ms = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0, 0).getTime() - now;
	if (eta_ms < 0) {
		eta_ms += twentyFourHours;
	}
	setTimeout(function() {
		// Run once on bot startup at the next time
		func(client);

		// Run every 24 hours from then
		setInterval(func, twentyFourHours, client);
	}, eta_ms);
}

exports.runTasks = runTasks;
