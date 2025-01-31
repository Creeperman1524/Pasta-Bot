const { birthdays } = require('../birthdays.json');

module.exports = {
	name: 'birthdayDisplay',

	async execute() {
		const now = new Date();

		let birthday;
		let checkNextYear = false;
		let found = false;

		loop:
		while (!found) {
			for (const b in birthdays) {
				birthday = b;
				// Finds the first birthday that's after today
				// or currently today to display before 7pm
				const bdate = convertDate(birthdays[b], now, checkNextYear);
				if (bdate.getTime() > now || (bdate.getMonth() == now.getMonth() && bdate.getDate() == now.getDate() && now.getHours() < 19)) {
					found = true;
					break loop;
				}
			}
			checkNextYear = true;
		}

		// Calculates the seconds, days, hours, and minutes until the birthday
		const seconds = (convertDate(birthdays[birthday], now, checkNextYear).getTime() - now) / 1000;
		const days = Math.floor(seconds / 24 / 60 / 60);
		const hours = Math.floor(seconds % (60 * 60 * 24) / (60 * 60));
		const minutes = Math.floor(seconds % (60 * 60) / 60);

		if (days >= 1) { // Further than 1 day away
			return [`${days}d ${hours}h 🎂 ${birthday}`, ''];
		} else if (days < 1 && hours >= 0) { // 0-24h
			return [`${hours}h ${minutes}m 🎂 ${birthday}`, ''];
		} else { // The day of
			return [`🎂 Happy birthday ${birthday}!`];
		}
	},
};

function convertDate(arr, day, checkNextYear) {
	return new Date(checkNextYear ? day.getFullYear() + 1 : day.getFullYear(), arr[0] - 1, arr[1]);
}
