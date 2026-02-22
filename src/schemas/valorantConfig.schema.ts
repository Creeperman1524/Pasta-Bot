import mongoose, { Schema, Document } from 'mongoose';

/**
 * Type for the ValorantConfig Schema
 * Holds valorant configurations for the valorant command for each user
 */
export type ValorantConfigData = {
	/**
	 * The userID of these configs, used for indexing
	 * @example 123456789
	 */
	userID: string;

	/**
	 * The valorant account PUUID to link to this user
	 * @example VVVVVVVV-WWWW-XXXX-YYYY-ZZZZZZZZZZZZ
	 */
	puuid: string;
};

// Document type
export interface IValorantConfig extends ValorantConfigData, Document<string> {}

// Schema type
const ValorantConfigSchema: Schema = new Schema({
	userID: { type: String, required: true },
	puuid: { type: String, required: false }
});

export default mongoose.model<IValorantConfig>('valorantconfigs', ValorantConfigSchema);
