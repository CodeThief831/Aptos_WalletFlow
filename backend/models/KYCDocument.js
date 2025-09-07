const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: ['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true,
    trim: true
  },
  documentImages: [{
    type: {
      type: String,
      enum: ['front', 'back', 'selfie'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  verificationDetails: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  expiryDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
kycDocumentSchema.index({ user: 1, status: 1 });
kycDocumentSchema.index({ documentType: 1, documentNumber: 1 });

// Static method to find by user
kycDocumentSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId, isActive: true })
    .sort({ createdAt: -1 });
};

// Static method to find pending documents
kycDocumentSchema.statics.findPending = function() {
  return this.find({ status: 'pending', isActive: true })
    .populate('user', 'name email')
    .sort({ createdAt: 1 });
};

module.exports = mongoose.model('KYCDocument', kycDocumentSchema);
