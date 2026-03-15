import { leaderboard, leaderboardMulti } from '../../src/util/leaderboard';
import { MinesweeperStatsData } from '../../src/schemas/minesweeperStats.schema';

type FakeUser = MinesweeperStatsData;

function makeUsers(count: number): FakeUser[] {
	return Array.from({ length: count }, (_, i) => ({
		userID: `user-${i}`,
		totalGames: i + 2,
		wins: i + 1,
		fastestTime: 999,
		currentGameID: ''
	}));
}

describe('leaderboard()', () => {
	it('sorts descending by default', () => {
		const users = makeUsers(3);
		const result = leaderboard(users, false, 'wins', 'nobody');
		expect(result).toMatch(/\*\*1\*\* - \*\*<@user-2>\*\*/); // highest first
	});

	it('sorts ascending when flag is set', () => {
		const users = makeUsers(3);
		const result = leaderboard(users, true, 'wins', 'nobody');
		expect(result).toMatch(/\*\*1\*\* - \*\*<@user-0>\*\*/); // lowest first
	});

	it('caps display at 10 entries', () => {
		const users = makeUsers(15);
		const result = leaderboard(users, false, 'wins', 'nobody');
		const matches = result.match(/\*\*\d+\*\* - \*\*<@/g) ?? [];
		expect(matches.length).toBe(10);
	});

	it('appends viewer entry below fold when outside top 10', () => {
		const users = makeUsers(15);
		const result = leaderboard(users, false, 'wins', 'user-0'); // lowest rank
		expect(result).toContain('`⋮`');
		expect(result).toContain('<@user-0>');
	});

	it('does not duplicate viewer if already in top 10', () => {
		const users = makeUsers(5);
		const result = leaderboard(users, false, 'wins', 'user-4'); // top user
		const occurrences = (result.match(/user-4/g) ?? []).length;
		expect(occurrences).toBe(1);
		expect(result).not.toContain('`⋮`');
	});
});

describe('leaderboardMulti()', () => {
	const users = makeUsers(3).map((u) => ({ ...u, totalGames: u.wins * 2 }));

	it('sorts by the first variable', () => {
		const result = leaderboardMulti(
			users,
			false,
			['totalGames', 'wins'],
			['Played', 'Won'],
			'nobody'
		);
		expect(result).toMatch(/\*\*1\*\* - \*\*<@user-2>\*\*/);
	});

	it('renders a header with display names', () => {
		const result = leaderboardMulti(
			users,
			false,
			['totalGames', 'wins'],
			['Played', 'Won'],
			'nobody'
		);
		expect(result).toContain('*(Played | Won*)');
	});

	it('includes all extra variables per row', () => {
		const result = leaderboardMulti(
			users,
			false,
			['totalGames', 'wins'],
			['Played', 'Won'],
			'nobody'
		);
		// Each row should have two backtick-wrapped values
		const rows = result.split('\n').filter((l) => l.includes('<@'));
		rows.forEach((row) => {
			const vals = row.match(/`\d+`/g) ?? [];
			expect(vals.length).toBeGreaterThanOrEqual(2);
		});
	});

	it('appends viewer entry below fold when outside top 10', () => {
		const manyUsers = makeUsers(15).map((u) => ({ ...u, totalGames: u.wins * 2 }));
		const result = leaderboardMulti(
			manyUsers,
			false,
			['totalGames', 'wins'],
			['Played', 'Won'],
			'user-0'
		);
		expect(result).toContain('`⋮`');
		expect(result).toContain('<@user-0>');
	});
});
