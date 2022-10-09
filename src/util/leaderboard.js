/**
 * A function that creates a leaderboard from the data to be listed for games and rankings
 * @param {Map<Users>} users A map of all of the users to be used in the leaderboard
 * @param {Boolean} ascending Whether or not the leaderboard should ascend or descend while going down
 * @param {String} variable	The statistic which you would like to compare
 * @returns {Map<String>} Returns a map of the text to be displayed for the leaderboard
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
		return `**\`${index + 1}\`** - **<@${user.userID}>** : \`${user[variable]}\``;
	}).join('\n');

	// Adds the user's stats at the bottom if they are not on the list
	sortedUsers.map((user, index) => {
		if(user.userID == userID && index + 1 > amountToShow) {
			description += '\n`⋮`\n';
			description += `**\`${index + 1}\`** - **<@${user.userID}>** : \`${user[variable]}\``;
		}
	});

	return description;
}

module.exports = {
	leaderboard,
};