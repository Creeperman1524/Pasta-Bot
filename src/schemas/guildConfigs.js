const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
	guildID: { type: String, required: true },
	reactionMessages: { type: {}, required: false },
	loggingChannelID: { type: String, required: false },

	lastEdited: { type: String, required: true },
}, { minimize: false });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);