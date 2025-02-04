const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
	userID: { type: String, required: true, unique: true },
	balance: { type: Number, required: true, default: 100 }, // should still be grround truth

	gamePoints: { type: Number, required: true, default: 0 }, // used for statistics
});

module.exports = mongoose.model('BankAccounts', bankSchema);
