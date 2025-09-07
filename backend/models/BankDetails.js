const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'salary'],
    default: 'savings'
  },
  bankCountry: {
    type: String,
    required: true,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  nickname: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
bankDetailsSchema.index({ userId: 1, isActive: 1 });
bankDetailsSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default bank account per user
bankDetailsSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        _id: { $ne: this._id },
        isActive: true 
      },
      { isDefault: false }
    );
  }
  next();
});

// Virtual for masked account number
bankDetailsSchema.virtual('maskedAccountNumber').get(function() {
  if (this.accountNumber && this.accountNumber.length > 4) {
    return '****' + this.accountNumber.slice(-4);
  }
  return this.accountNumber;
});

// Ensure virtual fields are included in JSON
bankDetailsSchema.set('toJSON', { virtuals: true });
bankDetailsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
