import fs from 'fs';
import { statusInterval } from '../config.json';
import { ActivityType, PresenceStatusData, PresenceUpdateStatus } from 'discord.js';
import { TaskInterval } from '../util/types/task';
import { Status, StatusRecord, StatusUpdate } from '../util/types/status';

const functions = [] as Status[];
const statusFiles = fs.readdirSync('./src/status');

// Gather activity files from folder
(async () => {
	for (const file of statusFiles) {
		const func = await import(`../status/${file.slice(0, -3)}`);
		functions.push(func.default);
	}
})();

// Loop index
let i = 0;

function iterateCounter(presences: StatusRecord) {
	i++; // Initially increment the counter
	// Skip over the server status if there are no players online (as long as there are more statuses to be shown)
	if (
		Object.keys(presences)[i] == 'displayServer' &&
		presences['displayServer'].activity !== PresenceUpdateStatus.Online &&
		functions.length > 1
	) {
		i++;
	}
	// Overflow check
	if (i > functions.length - 1) i = 0;
}

export default {
	name: 'statusSystem',
	mode: 'INTERVAL',
	interval: parseInt(statusInterval),

	async execute(client) {
		// The presence that will be displayed
		let botPresence: StatusUpdate = {
			activity: PresenceUpdateStatus.DoNotDisturb,
			message: ''
		};

		// Stores what all of the functions want to be displayed
		const presences = {} as StatusRecord;
		for (const func of functions) {
			presences[func.name] = await func.execute(client);
		}

		// Always display's the status as the server's status
		botPresence.activity = presences['displayServer'].activity;

		// Displays the function on this cycle
		botPresence.message = presences[Object.keys(presences)[i]].message;

		// Iterates the counter
		iterateCounter(presences);

		// Set's the bot's presence
		client.user?.setPresence({
			activities: [{ name: botPresence.message, type: ActivityType.Watching }],
			status: botPresence.activity as PresenceStatusData
		});
		// logger
		// 	.child({ mode: 'STATUS' })
		// 	.debug(
		// 		`Status has been updated with status '${botPresence.activity}' and activity '${botPresence.message}'`
		// 	);
	}
} as TaskInterval;
