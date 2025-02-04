const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
	userID: { type: String, required: true, unique: true },
	balance: { type: Number, required: true, default: 100 }, // ground truth for the balance

	// Statistics
	gamePoints: { type: Number, required: true, default: 0 },
	messagePoints: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.model('BankAccounts', bankSchema);
