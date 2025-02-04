const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
	userID: { type: String, required: true, unique: true },
	balance: { type: Number, required: true, default: 100 }, // ground truth for the balance

	// Statistics
	gameEarnings: { type: Number, required: true, default: 0 },
	messageEarnings: { type: Number, required: true, default: 0 },
	lifetimeEarnings: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.model('BankAccounts', bankSchema);
