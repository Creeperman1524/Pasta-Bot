const mongoose = require('mongoose');

const tictactoeStatsSchema = new mongoose.Schema({
	userID: { type: String, required: true },
	winsHuman: { type: Number, default: 0 },
	winsBot: { type: Number, default: 0 },
	lossesHuman: { type: Number, default: 0 },
	lossesBot: { type: Number, default: 0 },
	totalHuman: { type: Number, default: 0 },
	totalBot: { type: Number, default: 0 },
});

module.exports = mongoose.model('TictactoeStats', tictactoeStatsSchema);