const mongoose = require('mongoose');

const minesweeperStatsSchema = new mongoose.Schema({
	userID: { type: String, required: true },
	wins: { type: Number, default: 0 },
	totalGames: { type: Number, default: 0 },
	fastestTime: { type: Number, default: Number.MAX_SAFE_INTEGER },
});

module.exports = mongoose.model('MinesweeperStats', minesweeperStatsSchema);