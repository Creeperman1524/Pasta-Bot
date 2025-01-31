const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
	botID: { type: String, required: true, unique: true },
	commandsLastUpdated: { type: String, required: true },
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
