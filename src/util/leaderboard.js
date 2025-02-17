/**
 * A function that creates a leaderboard from the data to be listed for games and rankings
 * @param {Map<Users>} users 	A map of all of the users to be used in the leaderboard
 * @param {Boolean} ascending 	Whether or not the leaderboard should ascend or descend while going down
 * @param {String} variable		The statistic which you would like to compare
 * @returns {Map<String>} 		Returns a map of the text to be displayed for the leaderboard
 */
function leaderboard(users, ascending, variable, userID) {
	const amountToShow = 10;

	// Sorts the users in ascending or descending order
	const sortedUsers = users.sort((a, b) => {
		return ascending ? a[variable] - b[variable] : b[variable] - a[variable];
	});

	const topLeaderboard = sortedUsers.slice(0, amountToShow);

	// Adds the surrounding text to be displayed on the leaderboard
	let description = topLeaderboard.map((user, index) => {
		return `**${index + 1}** - \`${user[variable]}\` : <@${user.userID}>`;
	}).join('\n');

	// Adds the user's stats at the bottom if they are not on the list
	sortedUsers.map((user, index) => {
		if (user.userID == userID && index + 1 > amountToShow) {
			description += '\n⋮\n';
			description += `**${index + 1}** - \`${user[variable]}\` : <@${user.userID}>`;
		}
	});

	return description;
}

/**
 * A function that creates a leaderboard from the data to be listed for games and rankings
 * @param {Map<Users>} users 	A map of all of the users to be used in the leaderboard
 * @param {Boolean} ascending 	Whether or not the leaderboard should ascend or descend while going down
 * @param {String[]} variable	The statistics which you would like to display (the first is the sorting anchor)
 * @param {String[]} display 	The human readable text of the variables
 * @returns {Map<String>} 		Returns a map of the text to be displayed for the leaderboard
 */
function leaderboardMulti(users, ascending, variables, display, userID) {
	const amountToShow = 1;

	// Sorts the users in ascending or descending order
	const sortedUsers = users.sort((a, b) => {
		return ascending ? a[variables[0]] - b[variables[0]] : b[variables[0]] - a[variables[0]];
	});

	const topLeaderboard = sortedUsers.slice(0, amountToShow);

	// Adds the header to the leaderboard
	let description = `*(${ display[0]}`;

	for (let i = 1; i < display.length; i++) {
		description += ` | ${ display[i]}`;
	}

	description += '*)\n';

	// Adds the surrounding text to be displayed on the leaderboard
	description += topLeaderboard.map((user, index) => {
		let desc = `**${index + 1}** - \`${user[variables[0]]}\``;
		for (let i = 1; i < variables.length; i++) {
			desc += ` | \`${user[variables[i]]}\``;
		}
		desc += ` : <@${user.userID}>`;
		return desc;
	}).join('\n');

	// Adds the user's stats at the bottom if they are not on the list
	sortedUsers.map((user, index) => {
		if (user.userID == userID && index + 1 > amountToShow) {
			description += '\n⋮\n';
			description += `**${index + 1}** - \`${user[variables[0]]}\``;
			for (let i = 1; i < variables.length; i++) {
				description += ` | \`${user[variables[i]]}\``;
			}
			description += ` : <@${user.userID}>`;
		}
	});

	return description;
}


module.exports = {
	leaderboard, leaderboardMulti,
};
