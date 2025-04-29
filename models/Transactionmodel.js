const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  reference: {
    type: String,
    unique: true,  // Remove this line
    default: () => `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  // Account Relationships - make these more flexible
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return ['transfer', 'withdrawal', 'payment', 'fee'].includes(this.type);
    }
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return ['transfer', 'deposit'].includes(this.type);
    }
  },

  // Rest of your schema...
}, { timestamps: true });

// Indexes for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ fromAccount: 1, status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true, sparse: true });

// Virtuals for frontend convenience
transactionSchema.virtual('formattedAmount').get(function() {
  return `$${this.amount.toFixed(2)}`;
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;