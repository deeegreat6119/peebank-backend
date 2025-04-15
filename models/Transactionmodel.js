const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Core Transaction Data
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  type: {
    type: String,
    required: true,
    enum: ['transfer', 'deposit', 'withdrawal', 'payment', 'fee'],
    default: 'transfer'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed'
  },
  description: String,

  // Account Relationships
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() { return this.type === 'transfer'; }
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() { return ['transfer', 'deposit'].includes(this.type); }
  },

  // Metadata
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reference: {
    type: String,
    unique: true,
    default: () => `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  metadata: {
    ipAddress: String,
    device: String,
    location: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ fromAccount: 1, status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });

// Virtuals for frontend convenience
transactionSchema.virtual('formattedAmount').get(function() {
  return `$${this.amount.toFixed(2)}`;
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;