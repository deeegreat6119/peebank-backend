const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['checking'], required: true },
  balance: { type: Number, default: 0 },
  accountNumber: { type: String, required: true, unique: true },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', accountSchema);