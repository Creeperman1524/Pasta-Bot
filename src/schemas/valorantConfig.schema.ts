import mongoose, { Schema } from 'mongoose';

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

// Schema type
const ValorantConfigSchema: Schema = new Schema<ValorantConfigData>({
	userID: { type: String, required: true },
	puuid: { type: String, required: false }
});

export default mongoose.model<ValorantConfigData>('valorantconfigs', ValorantConfigSchema);
