const mongoose = require('mongoose');

const valorantConfigSchema = new mongoose.Schema({
	userID: { type: String, required: true },
	puuid: { type: String, required: false },
});

module.exports = mongoose.model('ValorantConfig', valorantConfigSchema);
