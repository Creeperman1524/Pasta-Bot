export type RankResponse = RankData | ErrorResponse;
export type AccountResponse = AccountData | ErrorResponse;

// From https://docs.henrikdev.xyz/valorant/api-reference/accounts
export type AccountData = {
	status: 200;
	data: {
		puuid: string;
	};
};

// From https://docs.henrikdev.xyz/valorant/api-reference/mmr
export type RankData = {
	status: 200;
	data: {
		current: {
			tier: {
				name: string;
			};
		};
	};
};

export type ErrorResponse = {
	status: number;
	errors: {
		message: string;
		code: number;
		details: string;
	}[];
};
