import mongoose, { Schema } from 'mongoose';

/**
 * Type for the TictactoeStats Schema
 * Holds statistics about tictactoe for each user
 */
export type TictactoeStatsData = {
	/**
	 * The userID of these statistics, used for indexing
	 * @example 123456789
	 */
	userID: string;

	/**
	 * The number of wins against other users in tictactoe games
	 * @example 10
	 */
	winsHuman: number;

	/**
	 * The number of wins against the bot in tictactoe games
	 * @example 10
	 */
	winsBot: number;

	/**
	 * The number of wins in total in tictactoe games
	 * @example 10
	 */
	wins: number;

	/**
	 * The number of losses against other users in tictactoe games
	 * @example 10
	 */
	lossesHuman: number;

	/**
	 * The number of losses against the bot in tictactoe games
	 * @example 10
	 */
	lossesBot: number;

	/**
	 * The total number of games played against other users
	 * @example 10
	 */
	totalHuman: number;

	/**
	 * The total number of games played against the bot
	 * @example 10
	 */
	totalBot: number;

	/**
	 * The total number of games played
	 * @example 10
	 */
	totalGames: number;
};

// Schema Type
const TictactoeStatsSchema: Schema = new Schema<TictactoeStatsData>({
	userID: { type: String, required: true },
	winsHuman: { type: Number, default: 0 },
	winsBot: { type: Number, default: 0 },
	wins: { type: Number, default: 0 },
	lossesHuman: { type: Number, default: 0 },
	lossesBot: { type: Number, default: 0 },
	totalHuman: { type: Number, default: 0 },
	totalBot: { type: Number, default: 0 },
	totalGames: { type: Number, default: 0 }
});

export default mongoose.model<TictactoeStatsData>('tictactoestats', TictactoeStatsSchema);
