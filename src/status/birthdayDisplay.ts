import { PresenceUpdateStatus } from 'discord.js';
import { birthdays as rawBirthdays } from '../birthdays.json';
import { Status, StatusUpdate } from '../util/types/status';

const birthdays = rawBirthdays as Record<string, string[]>;

export default {
	name: 'birthdayDisplay',

	async execute() {
		const now = new Date();

		let birthday;
		let checkNextYear = false;
		let found = false;

		loop: while (!found) {
			for (const b in birthdays) {
				birthday = b;
				// Finds the first birthday that's after today
				// or currently today to display before 7pm
				const bdate = convertDate(birthdays[b], now, checkNextYear);
				if (
					bdate.getTime() > now.getTime() ||
					(bdate.getMonth() == now.getMonth() &&
						bdate.getDate() == now.getDate() &&
						now.getHours() < 19)
				) {
					found = true;
					break loop;
				}
			}
			checkNextYear = true;
		}

		if (!birthday) return;

		// Calculates the seconds, days, hours, and minutes until the birthday
		const seconds =
			(convertDate(birthdays[birthday], now, checkNextYear).getTime() - now.getTime()) / 1000;
		const days = Math.floor(seconds / 24 / 60 / 60);
		const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
		const minutes = Math.floor((seconds % (60 * 60)) / 60);

		if (days >= 1) {
			// Further than 1 day away
			return {
				message: `${days}d ${hours}h 🎂 ${birthday}`,
				activity: PresenceUpdateStatus.Idle
			} as StatusUpdate;
		} else if (days < 1 && hours >= 0) {
			// 0-24h
			return {
				message: `${hours}h ${minutes}m 🎂 ${birthday}`,
				activity: PresenceUpdateStatus.Idle
			} as StatusUpdate;
		} else {
			// The day of
			return {
				message: `🎂 Happy birthday ${birthday}!`,
				activity: PresenceUpdateStatus.Idle
			} as StatusUpdate;
		}
	}
} as Status;

function convertDate(arr: string[], day: Date, checkNextYear: boolean) {
	return new Date(
		checkNextYear ? day.getFullYear() + 1 : day.getFullYear(),
		parseInt(arr[0]) - 1,
		parseInt(arr[1])
	);
}
