const { events } = require('../events.json');

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

		const seconds = (convertDate(events[event]).getTime() - now) / 1000;
		const days = Math.floor(seconds / 24 / 60 / 60);
		const hours = Math.floor(seconds % (60 * 60 * 24) / (60 * 60));
		const minutes = Math.floor(seconds % (60 * 60) / 60);

		if (days < 1) {
			return [`${hours}h ${minutes}m - ${event}`, ''];
		} else {
			return [`${days}d ${hours}h - ${event}`, ''];
		}
	},
};

function convertDate(arr) {
	return new Date(`20${ arr[0]}`, arr[1] - 1, arr[2], arr[3], arr[4]);
}
