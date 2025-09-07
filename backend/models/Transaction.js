const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  amount: {
    inr: {
      type: Number,
      required: true,
      validate: {
        validator: function(value) {
          // Allow 0 for direct transfers (when paymentId indicates direct transfer)
          if (this.paymentId === 'direct_wallet_transfer' || 
              this.paymentId === 'direct_wallet_transfer_failed' ||
              (this.metadata && this.metadata.transferType === 'direct_payment')) {
            return value >= 0;
          }
          // For on-ramp transactions, require minimum ₹10
          return value >= 10;
        },
        message: 'Minimum amount is ₹10 for on-ramp transactions'
      }
    },
    token: {
      type: Number,
      required: true
    }
  },
  tokenType: {
    type: String,
    enum: ['APT', 'USDC'],
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: [
      'created', 
      'payment_verified', 
      'transfer_pending', 
      'completed', 
      'failed', 
      'cancelled',
      // Off-ramp specific statuses
      'withdrawal_requested',
      'transfer_verified',
      'bank_transfer_initiated',
      'bank_transfer_completed'
    ],
    default: 'created'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  transferStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  transactionHash: {
    type: String,
    default: null
  },
  explorerUrl: {
    type: String,
    default: null
  },
  conversionRate: {
    type: Number,
    required: true
  },
  fees: {
    razorpay: {
      type: Number,
      default: 0
    },
    gas: {
      type: Number,
      default: 0
    },
    platform: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    razorpayOrderId: String,
    receiptId: String
  },
  timestamps: {
    created: {
      type: Date,
      default: Date.now
    },
    paymentVerified: {
      type: Date,
      default: null
    },
    transferCompleted: {
      type: Date,
      default: null
    }
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ walletAddress: 1 });
transactionSchema.index({ transactionHash: 1 });

// Virtual for total fees
transactionSchema.virtual('totalFees').get(function() {
  return this.fees.razorpay + this.fees.gas + this.fees.platform;
});

// Virtual for net amount received
transactionSchema.virtual('netTokenAmount').get(function() {
  return this.amount.token; // In our case, user pays all fees
});

// Static method to find by user
transactionSchema.statics.findByUser = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

// Static method to find successful transactions
transactionSchema.statics.findSuccessful = function(userId) {
  return this.find({ 
    user: userId, 
    status: 'completed',
    paymentStatus: 'success',
    transferStatus: 'success'
  }).sort({ createdAt: -1 });
};

// Static method to get user stats
transactionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalInr: { $sum: '$amount.inr' },
        totalTokens: { $sum: '$amount.token' }
      }
    }
  ]);
  
  return stats;
};

// Method to update status
transactionSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  
  if (newStatus === 'payment_verified' && !this.timestamps.paymentVerified) {
    this.timestamps.paymentVerified = new Date();
    this.paymentStatus = 'success';
  }
  
  if (newStatus === 'completed' && !this.timestamps.transferCompleted) {
    this.timestamps.transferCompleted = new Date();
    this.transferStatus = 'success';
  }
  
  if (newStatus === 'failed') {
    this.paymentStatus = additionalData.paymentFailed ? 'failed' : this.paymentStatus;
    this.transferStatus = additionalData.transferFailed ? 'failed' : this.transferStatus;
  }
  
  // Update other fields if provided
  Object.keys(additionalData).forEach(key => {
    if (this.schema.paths[key]) {
      this[key] = additionalData[key];
    }
  });
  
  return this.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
