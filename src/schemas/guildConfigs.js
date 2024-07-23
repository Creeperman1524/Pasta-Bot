const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
	guildID: { type: String, required: true },

	modules: { type: {}, required: false }, // The modules enabled for the guild

	reactionMessages: { type: {}, required: false }, // Contains the reaction message
	valorantRoles: { type: {}, required: false }, // Contains the valorant role data

	loggingChannelID: { type: String, required: false }, // The logging channel
}, { minimize: false });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
