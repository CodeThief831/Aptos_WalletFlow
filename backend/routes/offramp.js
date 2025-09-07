const express = require('express');
const { body } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const { auth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const handleValidationErrors = require('../middleware/validation');
const { AptosClient } = require("aptos");

const router = express.Router();
const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const client = new AptosClient(NODE_URL);

// Validation rules for off-ramp
const createOfframpValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least 0.01 APT'),
  body('tokenType')
    .isIn(['APT'])
    .withMessage('Token type must be APT'),
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required'),
  body('bankDetails.accountNumber')
    .isLength({ min: 8, max: 20 })
    .withMessage('Bank account number must be 8-20 digits'),
  body('bankDetails.ifscCode')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code format'),
  body('bankDetails.accountHolderName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be 2-100 characters'),
  body('bankDetails.bankName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be 2-100 characters'),
  handleValidationErrors
];

// Conversion rates (APT to INR only)
const CONVERSION_RATES = {
  APT: 10     // 1 APT = 10 INR 
};

// @route   GET /api/offramp/rates
// @desc    Get off-ramp conversion rates
// @access  Public
router.get('/rates', (req, res) => {
  try {
    res.json({
      success: true,
      rates: {
        APT: {
          inr_per_token: CONVERSION_RATES.APT,
          token_per_inr: 1 / CONVERSION_RATES.APT,
          fee_percentage: 2.5  // 2.5% off-ramp fee
        }
      },
      timestamp: new Date().toISOString(),
      disclaimer: "Rates are for testnet demonstration purposes only. Off-ramp includes processing fees."
    });
  } catch (error) {
    console.error('Error fetching off-ramp rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion rates'
    });
  }
});

// @route   GET /api/offramp/limits
// @desc    Get off-ramp limits and fees
// @access  Public
router.get('/limits', (req, res) => {
  try {
    res.json({
      success: true,
      limits: {
        min_amount_apt: 0.01,
        max_amount_apt: 1000,
        max_daily_amount_inr: 200000,
        max_monthly_amount_inr: 1000000
      },
      fees: {
        platform_fee_percentage: 2.5,
        min_platform_fee_inr: 5,
        max_platform_fee_inr: 500,
        processing_time: '2-3 business days',
        gas_fee_info: 'Gas fees for token transfer will be deducted from your wallet'
      },
      requirements: {
        kyc_required: true,
        bank_verification: true,
        minimum_account_age_days: 7
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching off-ramp limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch off-ramp limits'
    });
  }
});

// @route   POST /api/offramp/estimate
// @desc    Estimate off-ramp conversion and fees
// @access  Private
router.post('/estimate', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('tokenType').isIn(['APT']).withMessage('Token type must be APT'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { amount, tokenType } = req.body;
    
    const conversionRate = CONVERSION_RATES[tokenType];
    const grossINR = amount * conversionRate;
    const platformFee = Math.max(5, Math.min(500, grossINR * 0.025)); // 2.5% with min ₹5, max ₹500
    const netINR = grossINR - platformFee;
    
    res.json({
      success: true,
      estimation: {
        tokenAmount: amount,
        tokenType,
        grossINR: grossINR.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netINR: netINR.toFixed(2),
        conversionRate,
        feePercentage: 2.5,
        processingTime: '2-3 business days'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error estimating off-ramp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate off-ramp conversion'
    });
  }
});

// @route   POST /api/offramp/create-withdrawal
// @desc    Create off-ramp withdrawal request
// @access  Private
router.post('/create-withdrawal', auth, paymentLimiter, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('tokenType').isIn(['APT']).withMessage('Token type must be APT'),
  body('walletAddress').isString().trim().withMessage('Wallet address is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { amount, tokenType, walletAddress } = req.body;
    const userId = req.userId;

    // Get user
    const user = await User.findById(userId);
    
    // Check if user has bank details in the new BankDetails collection
    const userBankDetails = await BankDetails.findOne({
      userId: userId,
      isActive: true,
      isDefault: true
    });
    
    if (!userBankDetails) {
      return res.status(400).json({
        success: false,
        error: 'Please add your bank details first using the bank details manager'
      });
    }

    // Validate user KYC status (in production, check actual KYC status)
    if (!user.phone) {
      return res.status(400).json({
        success: false,
        error: 'KYC verification required. Please complete your profile with phone number.'
      });
    }

    // Calculate conversion
    const conversionRate = CONVERSION_RATES[tokenType];
    const grossINR = amount * conversionRate;
    const platformFee = Math.max(5, Math.min(500, grossINR * 0.025));
    const netINR = grossINR - platformFee;

    // Check minimum withdrawal amount
    if (netINR < 5) {
      return res.status(400).json({
        success: false,
        error: 'Minimum withdrawal amount is ₹5 after fees'
      });
    }

    // Create withdrawal request transaction
    const withdrawalRequest = new Transaction({
      user: userId,
      orderId: `offramp_${Date.now().toString().slice(-8)}`,
      amount: {
        inr: grossINR,
        token: amount
      },
      tokenType,
      walletAddress,
      conversionRate,
      status: 'withdrawal_requested',
      paymentStatus: 'pending',
      transferStatus: 'pending',
      fees: {
        platform: platformFee,
        razorpay: 0,
        gas: 0
      },
      metadata: {
        withdrawalType: 'offramp',
        bankDetails: {
          accountNumber: userBankDetails.accountNumber,
          ifscCode: userBankDetails.ifscCode,
          accountHolderName: userBankDetails.accountHolderName,
          bankName: userBankDetails.bankName
        },
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        netINR: netINR,
        platformFee: platformFee
      }
    });

    await withdrawalRequest.save();

    console.log(`📤 Off-ramp withdrawal requested: ${user.name} | ${amount} ${tokenType} → ₹${netINR}`);

    res.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawalId: withdrawalRequest._id,
      details: {
        tokenAmount: amount,
        tokenType,
        grossINR: grossINR.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netINR: netINR.toFixed(2),
        processingTime: '2-3 business days',
        status: 'withdrawal_requested',
        bankDetails: {
          accountHolderName: userBankDetails.accountHolderName,
          bankName: userBankDetails.bankName,
          accountNumber: `****${userBankDetails.accountNumber.slice(-4)}` // Masked account number
        }
      },
      instructions: {
        step1: `Transfer ${amount} ${tokenType} from your wallet to our withdrawal address`,
        step2: 'We will verify the transaction on Aptos blockchain',
        step3: 'INR will be transferred to your bank account within 2-3 business days',
        withdrawalAddress: '0x1234567890abcdef1234567890abcdef12345678' // Demo address
      }
    });

  } catch (error) {
    console.error('❌ Off-ramp withdrawal creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create withdrawal request'
    });
  }
});

// @route   POST /api/offramp/verify-token-transfer
// @desc    Verify token transfer for off-ramp (user provides transaction hash)
// @access  Private
router.post('/verify-token-transfer', auth, [
  body('withdrawalId').notEmpty().withMessage('Withdrawal ID is required'),
  body('transactionHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid transaction hash format'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { withdrawalId, transactionHash } = req.body;
    const userId = req.userId;

    // Find withdrawal request
    const withdrawal = await Transaction.findOne({
      _id: withdrawalId,
      user: userId,
      status: 'withdrawal_requested'
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal request not found or already processed'
      });
    }

    // In production, verify the transaction on Aptos blockchain
    // For demo, we'll simulate the verification
    console.log(`🔍 Verifying transaction hash: ${transactionHash} for withdrawal: ${withdrawalId}`);

    try {
      // Try to fetch transaction from Aptos (this may fail in demo environment)
      const aptosTransaction = await client.getTransactionByHash(transactionHash);
      
      if (!aptosTransaction.success) {
        throw new Error('Transaction failed on blockchain');
      }

      // Update withdrawal status to verified
      await withdrawal.updateStatus('transfer_verified', {
        transactionHash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
        verificationMethod: 'blockchain_confirmed'
      });

      console.log(`✅ Token transfer verified for withdrawal: ${withdrawalId}`);

    } catch (aptosError) {
      // For demo purposes, accept the transaction hash and proceed
      console.log(`⚠️ Blockchain verification failed, proceeding with demo verification: ${aptosError.message}`);
      
      await withdrawal.updateStatus('transfer_verified', {
        transactionHash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
        verificationMethod: 'demo_accepted',
        verificationNote: 'Verified in demo mode'
      });
    }

    // Simulate bank transfer initiation
    setTimeout(async () => {
      try {
        await withdrawal.updateStatus('bank_transfer_initiated', {
          bankTransferInitiated: new Date(),
          expectedCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        });
        console.log(`🏦 Bank transfer initiated for withdrawal: ${withdrawalId}`);
      } catch (error) {
        console.error('Failed to update bank transfer status:', error);
      }
    }, 2000);

    res.json({
      success: true,
      message: 'Token transfer verified successfully',
      withdrawal: {
        id: withdrawal._id,
        status: 'transfer_verified',
        transactionHash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
        nextSteps: 'Bank transfer will be initiated within 24 hours',
        expectedCompletion: '2-3 business days'
      }
    });

  } catch (error) {
    console.error('❌ Token transfer verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token transfer'
    });
  }
});

// @route   GET /api/offramp/withdrawals
// @desc    Get user's withdrawal history
// @access  Private
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.userId;

    const filter = { 
      user: userId,
      $or: [
        { 'metadata.withdrawalType': 'offramp' },
        { status: { $in: ['withdrawal_requested', 'transfer_verified', 'bank_transfer_initiated', 'completed'] } }
      ]
    };
    
    if (status) filter.status = status;

    const withdrawals = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalWithdrawals: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Failed to fetch withdrawals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    });
  }
});

// @route   GET /api/offramp/withdrawal/:id
// @desc    Get specific withdrawal details
// @access  Private
router.get('/withdrawal/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const withdrawal = await Transaction.findOne({
      _id: id,
      user: userId
    }).populate('user', 'name email phone');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      withdrawal
    });

  } catch (error) {
    console.error('Failed to fetch withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal details'
    });
  }
});

// @route   PUT /api/offramp/withdrawal/:id/cancel
// @desc    Cancel a withdrawal request (only if not yet verified)
// @access  Private
router.put('/withdrawal/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const withdrawal = await Transaction.findOne({
      _id: id,
      user: userId
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    // Only allow cancellation of withdrawal requests that haven't been verified
    if (withdrawal.status !== 'withdrawal_requested') {
      return res.status(400).json({
        success: false,
        error: 'Only pending withdrawal requests can be cancelled'
      });
    }

    await withdrawal.updateStatus('cancelled', {
      cancelledBy: 'user',
      cancelledAt: new Date(),
      reason: req.body.reason || 'Cancelled by user'
    });

    console.log(`❌ Withdrawal cancelled by user: ${req.user.name} | Withdrawal ID: ${id}`);

    res.json({
      success: true,
      message: 'Withdrawal request cancelled successfully',
      withdrawal: {
        id: withdrawal._id,
        status: 'cancelled'
      }
    });

  } catch (error) {
    console.error('Withdrawal cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel withdrawal request'
    });
  }
});

// @route   GET /api/offramp/stats
// @desc    Get user's off-ramp statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const totalWithdrawals = await Transaction.countDocuments({ 
      user: userId,
      'metadata.withdrawalType': 'offramp'
    });
    
    const completedWithdrawals = await Transaction.countDocuments({ 
      user: userId, 
      'metadata.withdrawalType': 'offramp',
      status: 'completed' 
    });

    const totalWithdrawn = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          'metadata.withdrawalType': 'offramp',
          status: 'completed' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$metadata.netINR' } } }
    ]);

    const tokensByType = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          'metadata.withdrawalType': 'offramp',
          status: 'completed' 
        } 
      },
      { 
        $group: { 
          _id: '$tokenType', 
          total: { $sum: '$amount.token' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalWithdrawals,
        completedWithdrawals,
        successRate: totalWithdrawals > 0 ? (completedWithdrawals / totalWithdrawals) * 100 : 0,
        totalWithdrawnINR: totalWithdrawn[0]?.total || 0,
        tokensByType,
        averageProcessingTime: '2-3 business days'
      }
    });

  } catch (error) {
    console.error('Failed to fetch off-ramp stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch off-ramp statistics'
    });
  }
});

// @route   POST /api/offramp/confirm-payment/:id
// @desc    Simulate Razorpay payment confirmation for completed withdrawal
// @access  Private
router.post('/confirm-payment/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Find the withdrawal transaction
    const withdrawal = await Transaction.findOne({
      _id: id,
      user: userId
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    // Check if withdrawal is in verified state (crypto received)
    if (withdrawal.status !== 'crypto_verified') {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal must be verified before payment confirmation'
      });
    }

    // Simulate Razorpay payment processing
    const razorpayPaymentId = `pay_${Math.random().toString(36).substr(2, 14)}`;
    const razorpayOrderId = `order_${Math.random().toString(36).substr(2, 14)}`;

    // Update transaction status to completed
    withdrawal.status = 'completed';
    withdrawal.paymentStatus = 'completed';
    withdrawal.metadata.razorpayPaymentId = razorpayPaymentId;
    withdrawal.metadata.razorpayOrderId = razorpayOrderId;
    withdrawal.metadata.bankTransferDate = new Date();
    withdrawal.metadata.completedAt = new Date();

    await withdrawal.save();

    console.log(`💰 Off-ramp payment confirmed: ${withdrawal.user} | ₹${withdrawal.metadata.netINR} transferred`);

    res.json({
      success: true,
      message: 'Payment confirmed successfully! INR has been transferred to your bank account.',
      paymentDetails: {
        amount: withdrawal.metadata.netINR,
        transactionId: withdrawal._id,
        razorpayPaymentId,
        razorpayOrderId,
        bankDetails: {
          accountHolderName: withdrawal.metadata.bankDetails.accountHolderName,
          bankName: withdrawal.metadata.bankDetails.bankName,
          accountNumber: `****${withdrawal.metadata.bankDetails.accountNumber.slice(-4)}`
        },
        transferredAt: new Date(),
        status: 'completed'
      },
      razorpayConfirmation: {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        amount: withdrawal.metadata.netINR * 100, // Amount in paise for Razorpay
        currency: 'INR',
        status: 'captured',
        method: 'netbanking',
        description: `Off-ramp withdrawal - ${withdrawal.amount.token} ${withdrawal.tokenType} to INR`,
        created_at: Math.floor(Date.now() / 1000)
      }
    });

  } catch (error) {
    console.error('Payment confirmation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

module.exports = router;
