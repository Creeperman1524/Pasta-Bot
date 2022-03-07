const { logger } = require('./logging.js');
const fs = require('fs');

const tasks = [];
const taskFiles = fs.readdirSync('./tasks');

// Gather tasks from folder
for (const file of taskFiles) {
	const task = require(`./tasks/${file}`);
	tasks.push(task);
}

// Runs the tasks
const runTasks = async (client) => {
	logger.child({ mode: 'TASKS' }).info('Started running tasks...');

	// Runs all tasks
	for(const task of tasks) {
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
		}
	}

	logger.child({ mode: 'TASKS' }).info('Tasks have been initialized');

};

exports.runTasks = runTasks;