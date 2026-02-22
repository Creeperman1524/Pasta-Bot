import mongoose, { Schema, Document } from 'mongoose';

/**
 * Type for the MinesweeperStats Schema
 * Holds statistics about minesweeper for each user
 */
export type MinesweeperStatsData = {
	/**
	 * The userID of these statistics, used for indexing
	 * @example 123456789
	 */
	userID: string;

	/**
	 * The amount of wins this user has of minesweeper games
	 * @example 10
	 */
	wins: number;

	/**
	 * The total number of games this user has of minesweeper
	 * @example 20
	 */
	totalGames: number;

	/**
	 * The fastest time the user has achieved winning a game of minesweeper, in seconds
	 * @example 12.34
	 */
	fastestTime: number;
};

// Document Type
export interface IMinesweeperStats extends MinesweeperStatsData, Document<string> {}

// Schema Type
const MinesweeperStatsSchema: Schema = new Schema({
	userID: { type: String, required: true },
	wins: { type: Number, default: 0 },
	totalGames: { type: Number, default: 0 },
	fastestTime: { type: Number, default: Number.MAX_SAFE_INTEGER }
});

export default mongoose.model<IMinesweeperStats>('minesweeperstats', MinesweeperStatsSchema);
