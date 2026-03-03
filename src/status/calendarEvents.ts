import { PresenceUpdateStatus } from 'discord.js';
import { events as rawEvents } from '../events.json';
import { Status, StatusUpdate } from '../util/types/status';

const events = rawEvents as Record<string, number[]>;

module.exports = {
	name: 'calendarEvents',

	async execute() {
		const now = Date.now();

		let event;
		for (const e in events) {
			event = e;
			// Finds the first one that's after now
			if (convertDate(events[e]).getTime() > now) {
				break;
			}
		}

		if (!event) return;

		const seconds = (convertDate(events[event]).getTime() - now) / 1000;
		const days = Math.floor(seconds / 24 / 60 / 60);
		const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
		const minutes = Math.floor((seconds % (60 * 60)) / 60);

		if (days < 1) {
			return {
				message: `${hours}h ${minutes}m - ${event}`,
				activity: PresenceUpdateStatus.Idle
			} as StatusUpdate;
		} else {
			return {
				message: `${days}d ${hours}h - ${event}`,
				activity: PresenceUpdateStatus.Idle
			} as StatusUpdate;
		}
	}
} as Status;

function convertDate(arr: number[]) {
	return new Date(parseInt(`20${arr[0]}`), arr[1] - 1, arr[2], arr[3], arr[4]);
}
