const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
	userID: { type: String, required: true, unique: true },
	balance: { type: Number, required: true, default: 100 },
});

module.exports = mongoose.model('BankAccounts', bankSchema);
