const { birthdays } = require('../birthdays.json');

module.exports = {
	name: 'birthdayDisplay',

	async execute() {
		const now = new Date();

		let birthday;
		for(const b in birthdays) {
			birthday = b;
			// Finds the first birthday that's after today
			// or currently today to display before 7pm
			const bdate = convertDate(birthdays[b], now);
			if(bdate.getTime() > now || (bdate.getMonth() == now.getMonth() && bdate.getDay() == now.getDay() && now.getHours() < 19)) {
				break;
			}
		}

		// Calculates the seconds, days, hours, and minutes until the birthday
		const seconds = (convertDate(birthdays[birthday], now).getTime() - now) / 1000;
		const days = Math.floor(seconds / 24 / 60 / 60);
		const hours = Math.floor(seconds % (60 * 60 * 24) / (60 * 60));
		const minutes = Math.floor(seconds % (60 * 60) / 60);


		if(days >= 1) { // Further than 1 day away
			return [`${days}d ${hours}h 🎂 ${birthday}`, ''];
		} else if (days < 1 && hours >= 0) { // 0-24h
			return [`${hours}h ${minutes}m 🎂 ${birthday}`, ''];
		} else { // The day of
			return [`🎂 Happy birthday ${birthday}!`];
		}
	},
};

function convertDate(arr, day) {
	// If the current month is December, we want to check January birthdays for the next year
	const year = arr[0] == 1 && day.getMonth() == 11 ? day.getFullYear() + 1 : day.getFullYear();
	return new Date(year, arr[0] - 1, arr[1]);
}