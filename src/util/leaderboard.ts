import { MinesweeperStatsData } from '../schemas/minesweeperStats.schema';
import { TictactoeStatsData } from '../schemas/tictactoeStats.schema';

type LeaderboardSchemas = MinesweeperStatsData | TictactoeStatsData;

// Type annotation to let TypeScript know K is a numeric property of T
type NumericKeys<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];
type AnyKeys<T> = keyof T;

/**
 * A function that creates a leaderboard from the data to be listed for games and rankings
 * @param users     	A list of all of the users MongoDB documents to be used in the leaderboard
 * @param ascending 	Whether or not the leaderboard should ascend (true) or descend (false) while going down
 * @param variable		The statistic which you would like to compare
 * @param userID		The userID of the user viewing this
 * @returns  		 	Returns a map of the text to be displayed for the leaderboard
 */
export function leaderboard<T extends LeaderboardSchemas, K extends NumericKeys<T>>(
	users: T[],
	ascending: boolean,
	variable: K,
	userID: string
): string {
	const amountToShow = 10;

	// Sorts the users in ascending or descending order
	const sortedUsers = [...users].sort((a, b) => {
		const aVal = a[variable];
		const bVal = b[variable];

		if (typeof aVal !== 'number' || typeof bVal !== 'number') return 1;

		return ascending ? aVal - bVal : bVal - aVal;
	});

	const topLeaderboard = sortedUsers.slice(0, amountToShow);

	// Adds the surrounding text to be displayed on the leaderboard
	let description = topLeaderboard
		.map((user, index) => {
			return `**${index + 1}** - **<@${user.userID}>** : \`${user[variable]}\``;
		})
		.join('\n');

	// Adds the user's stats at the bottom if they are not on the list
	sortedUsers.map((user, index) => {
		if (user.userID == userID && index + 1 > amountToShow) {
			description += '\n`⋮`\n';
			description += `**${index + 1}** - **<@${user.userID}>** : \`${user[variable]}\``;
		}
	});

	return description;
}

/**
 * A function that creates a leaderboard from the data to be listed for games and rankings
 * @param users 	A list of all of the users to be used in the leaderboard
 * @param ascending Whether or not the leaderboard should ascend or descend while going down
 * @param variables	The statistics which you would like to display (the first is the sorting anchor)
 * @param display 	The human readable text of the variables
 * @returns 		Returns a map of the text to be displayed for the leaderboard
 */
export function leaderboardMulti<
	T extends { userID: string },
	First extends NumericKeys<T>,
	Rest extends AnyKeys<T> = AnyKeys<T>
>(
	users: T[],
	ascending: boolean,
	variables: [First, ...Rest[]],
	display: string[],
	userID: string
): string {
	const amountToShow = 10;

	// Sorts the users in ascending or descending order
	const sortedUsers = users.sort((a, b) => {
		const aVal = a[variables[0]];
		const bVal = b[variables[0]];

		if (typeof aVal !== 'number' || typeof bVal !== 'number') return 1;

		return ascending ? aVal - bVal : bVal - aVal;
	});

	const topLeaderboard = sortedUsers.slice(0, amountToShow);

	// Adds the header to the leaderboard
	let description = `*(${display[0]}`;

	for (let i = 1; i < display.length; i++) {
		description += ` | ${display[i]}`;
	}

	description += '*)\n';

	// Adds the surrounding text to be displayed on the leaderboard
	description += topLeaderboard
		.map((user, index) => {
			let desc = `**${index + 1}** - **<@${user.userID}>** : \`${user[variables[0]]}\``;
			for (let i = 1; i < variables.length; i++) {
				desc += ` | \`${user[variables[i]]}\``;
			}
			return desc;
		})
		.join('\n');

	// Adds the user's stats at the bottom if they are not on the list
	sortedUsers.map((user, index) => {
		if (user.userID == userID && index + 1 > amountToShow) {
			description += '\n`⋮`\n';
			description += `**${index + 1}** - **<@${user.userID}>** : \`${user[variables[0]]}\``;
			for (let i = 1; i < variables.length; i++) {
				description += ` | \`${user[variables[i]]}\``;
			}
		}
	});

	return description;
}
