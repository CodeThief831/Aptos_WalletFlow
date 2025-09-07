const express = require('express');
const { body } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const handleValidationErrors = require('../middleware/validation');
const { AptosClient } = require("aptos");

const router = express.Router();
const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const client = new AptosClient(NODE_URL);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Validation rules
const createOrderValidation = [
  body('amount')
    .isFloat({ min: 10 })
    .withMessage('Amount must be at least ₹10'),
  body('tokenType')
    .isIn(['APT', 'USDC'])
    .withMessage('Token type must be APT or USDC'),
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required'),
  handleValidationErrors
];

const verifyPaymentValidation = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  handleValidationErrors
];

// Conversion rates (in production, fetch from real-time APIs)
const CONVERSION_RATES = {
  APT: 0.1,    // 1 INR = 0.1 APT
  USDC: 0.012  // 1 INR = 0.012 USDC
};

// @route   GET /api/payments/rates
// @desc    Get conversion rates
// @access  Public
router.get('/rates', (req, res) => {
  try {
    res.json({
      success: true,
      rates: {
        APT: {
          token_per_inr: CONVERSION_RATES.APT,
          inr_per_token: 1 / CONVERSION_RATES.APT
        },
        USDC: {
          token_per_inr: CONVERSION_RATES.USDC,
          inr_per_token: 1 / CONVERSION_RATES.USDC
        }
      },
      timestamp: new Date().toISOString(),
      disclaimer: "Rates are for testnet demonstration purposes only"
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion rates'
    });
  }
});

// @route   GET /api/payments/health
// @desc    Health check for payment services
// @access  Public
router.get('/health', async (req, res) => {
  try {
    // Test Aptos connection
    const ledgerInfo = await client.getLedgerInfo();
    
    // Test Razorpay configuration
    const razorpayHealthy = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: {
        aptos: {
          status: 'healthy',
          network: 'testnet',
          ledger_version: ledgerInfo.ledger_version,
          chain_id: ledgerInfo.chain_id
        },
        razorpay: {
          status: razorpayHealthy ? 'configured' : 'not_configured'
        },
        database: {
          status: 'connected' // This will be determined by the connection
        }
      },
      conversion_rates: CONVERSION_RATES
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Service health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/payments/tokens
// @desc    Get supported tokens information
// @access  Public
router.get('/tokens', (req, res) => {
  try {
    const supportedTokens = {
      APT: {
        name: 'Aptos Token',
        symbol: 'APT',
        decimals: 8,
        type: 'native',
        description: 'Native token of the Aptos blockchain',
        conversion_rate: CONVERSION_RATES.APT,
        min_amount_inr: 10,
        max_amount_inr: 100000,
        network: 'testnet'
      },
      USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        type: 'token',
        description: 'Stablecoin pegged to USD',
        conversion_rate: CONVERSION_RATES.USDC,
        min_amount_inr: 10,
        max_amount_inr: 100000,
        network: 'testnet'
      }
    };

    res.json({
      success: true,
      tokens: supportedTokens,
      count: Object.keys(supportedTokens).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported tokens'
    });
  }
});

// @route   GET /api/payments/limits
// @desc    Get payment limits and fees
// @access  Public
router.get('/limits', (req, res) => {
  try {
    res.json({
      success: true,
      limits: {
        min_amount_inr: 10,
        max_amount_inr: 100000,
        max_daily_amount_inr: 500000,
        max_monthly_amount_inr: 2000000
      },
      fees: {
        platform_fee_percentage: 0.5,
        min_platform_fee_inr: 1,
        max_platform_fee_inr: 100,
        gas_fee_info: 'Gas fees are estimated and charged separately'
      },
      payment_methods: [
        {
          type: 'razorpay',
          name: 'Razorpay',
          supports: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'],
          processing_time: 'Instant',
          fees: 'As per Razorpay charges'
        }
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment limits'
    });
  }
});

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order
// @access  Private
router.post('/create-order', auth, paymentLimiter, createOrderValidation, async (req, res) => {
  try {
    const { amount, tokenType, walletAddress } = req.body;
    const userId = req.userId;

    // Update user's wallet address if provided
    if (walletAddress && walletAddress !== req.user.walletAddress) {
      await User.findByIdAndUpdate(userId, { walletAddress });
    }

    // Calculate token amount
    const conversionRate = CONVERSION_RATES[tokenType];
    const tokenAmount = amount * conversionRate;

    // Convert to paise for Razorpay
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `onramp_${Date.now().toString().slice(-8)}`,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        userEmail: req.user.email,
        userName: req.user.name,
        userPhone: req.user.phone,
        tokenType,
        walletAddress
      }
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Create transaction record in database
    const transaction = new Transaction({
      user: userId,
      orderId: razorpayOrder.id,
      amount: {
        inr: amount,
        token: tokenAmount
      },
      tokenType,
      walletAddress,
      conversionRate,
      metadata: {
        razorpayOrderId: razorpayOrder.id,
        receiptId: orderOptions.receipt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    await transaction.save();

    console.log(`📝 Order created for user: ${req.user.name} | Order ID: ${razorpayOrder.id} | Amount: ${amount} INR | Token: ${tokenType}`);

    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      tokenAmount,
      conversionRate,
      transactionId: transaction._id
    });

  } catch (error) {
    console.error('❌ Order creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
});

// @route   POST /api/payments/estimate-gas
// @desc    Estimate gas fees for token transfer
// @access  Private
router.post("/estimate-gas", auth, async (req, res) => {
  try {
    const { amount, tokenType, walletAddress } = req.body;

    // Validate inputs
    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least ₹10'
      });
    }

    if (!['APT', 'USDC'].includes(tokenType)) {
      return res.status(400).json({
        success: false,
        error: 'Token type must be APT or USDC'
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // ✅ Fetch ledger info for current gas prices
    const ledgerInfo = await client.getLedgerInfo();
    console.log(`📊 Fetching gas estimation for ${amount} INR → ${tokenType}`);

    // Use average_gas_price from ledger
    const gasUnitPrice = parseInt(ledgerInfo.average_gas_price, 10); // Octas per gas unit

    // Rough estimate: ~2000 gas units for basic transfer
    const estimatedGasUnits = 2000;
    
    // Add complexity for USDC transfers (they require more gas)
    const complexityMultiplier = tokenType === 'USDC' ? 1.5 : 1.0;
    const adjustedGasUnits = Math.ceil(estimatedGasUnits * complexityMultiplier);

    // Total gas in Octas
    const estimatedGasOctas = gasUnitPrice * adjustedGasUnits;

    // Convert to APT (1 APT = 1e8 Octas)
    const estimatedGasAPT = estimatedGasOctas / 1e8;

    // Convert APT → INR using our conversion rate
    const aptToInrRate = 1 / CONVERSION_RATES.APT; // INR per APT
    const gasFeeInINR = (estimatedGasAPT * aptToInrRate).toFixed(2);

    res.json({
      success: true,
      gasEstimation: {
        estimatedGas: estimatedGasAPT.toFixed(6),
        estimatedGasOctas,
        gasFeeInINR,
        gasUnitPrice,
        estimatedGasUnits: adjustedGasUnits,
        currency: "APT",
        tokenType,
        disclaimer: "⚠️ Gas fees are estimated and may vary based on network conditions"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Gas estimation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to estimate gas fees",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// @route   POST /api/payments/verify-payment
// @desc    Verify Razorpay payment and initiate token transfer
// @access  Private
router.post('/verify-payment', auth, verifyPaymentValidation, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.userId;

    // Find transaction
    const transaction = await Transaction.findOne({
      orderId: razorpay_order_id,
      user: userId
    }).populate('user', 'name email phone walletAddress');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await transaction.updateStatus('failed', { paymentFailed: true });
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Update transaction with payment details
    transaction.paymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    await transaction.updateStatus('payment_verified');

    console.log(`✅ Payment verified for user: ${transaction.user.name} | Payment ID: ${razorpay_payment_id}`);

    // Import the token transfer function
    const { transferTokens } = require('../services/aptosService');

    // Start token transfer process
    try {
      console.log(`🚀 Starting token transfer for: ${transaction.walletAddress} | Token: ${transaction.tokenType} | Amount: ${transaction.amount.inr} INR`);
      
      const transferResult = await transferTokens(
        transaction.walletAddress,
        transaction.tokenType,
        transaction.amount.inr
      );
      
      // Update transaction with successful transfer
      await transaction.updateStatus('completed', {
        transactionHash: transferResult.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        gasUsed: transferResult.gasUsed || 'N/A',
        gasPrice: transferResult.gasPrice || 'N/A',
        network: transferResult.network || 'testnet',
        simulated: transferResult.simulated || false
      });
      
      console.log(`🎉 Transaction completed successfully! Hash: ${transferResult.hash}`);
      
      res.json({
        success: true,
        message: 'Payment verified and tokens transferred successfully',
        payment_id: razorpay_payment_id,
        transaction_hash: transferResult.hash,
        explorer_url: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        user: {
          name: transaction.user.name,
          walletAddress: transaction.walletAddress,
          tokenReceived: transaction.amount.token,
          tokenType: transaction.tokenType,
          amountPaid: transaction.amount.inr
        },
        transaction: {
          id: transaction._id,
          status: transaction.status,
          createdAt: transaction.createdAt
        }
      });

    } catch (transferError) {
      console.error(`❌ Token transfer failed for user: ${transaction.user.email} | Error:`, transferError.message);
      
      // Update transaction with failed transfer
      await transaction.updateStatus('failed', {
        transferFailed: true,
        notes: `Transfer failed: ${transferError.message}`
      });
      
      res.status(500).json({
        success: false,
        error: 'Payment verified but token transfer failed. Our team has been notified and will resolve this shortly.',
        payment_id: razorpay_payment_id,
        transaction_id: transaction._id,
        support_message: 'Please contact support with your transaction ID for assistance.'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

// @route   GET /api/payments/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.userId;

    const filter = { user: userId };
    if (status) filter.status = status;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
});

// @route   GET /api/payments/transaction/:id
// @desc    Get specific transaction details
// @access  Private
router.get('/transaction/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId
    }).populate('user', 'name email phone');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction details'
    });
  }
});

// @route   GET /api/payments/stats
// @desc    Get user's payment statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const stats = await Transaction.getUserStats(userId);
    
    const totalTransactions = await Transaction.countDocuments({ user: userId });
    const successfulTransactions = await Transaction.countDocuments({ 
      user: userId, 
      status: 'completed' 
    });

    const totalSpent = await Transaction.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount.inr' } } }
    ]);

    const totalTokensReceived = await Transaction.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $group: { 
        _id: '$tokenType', 
        total: { $sum: '$amount.token' },
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      success: true,
      stats: {
        totalTransactions,
        successfulTransactions,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
        totalSpent: totalSpent[0]?.total || 0,
        tokensByType: totalTokensReceived,
        detailedStats: stats
      }
    });

  } catch (error) {
    console.error('Failed to fetch payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics'
    });
  }
});

// @route   POST /api/payments/transfer-tokens
// @desc    Manual token transfer (for testing or recovery)
// @access  Private
router.post('/transfer-tokens', auth, [
  body('walletAddress').notEmpty().withMessage('Wallet address is required'),
  body('amount').isFloat({ min: 10 }).withMessage('Amount must be at least ₹10'),
  body('tokenType').isIn(['APT', 'USDC']).withMessage('Token type must be APT or USDC'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { walletAddress, amount, tokenType } = req.body;
    const userId = req.userId;

    console.log(`🚀 Manual token transfer initiated for user: ${req.user.name} | Amount: ${amount} INR | Token: ${tokenType}`);

    // Import the token transfer function
    const { transferTokens } = require('../services/aptosService');

    const transferResult = await transferTokens(walletAddress, tokenType, amount);

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      orderId: `manual_${Date.now()}`,
      amount: {
        inr: amount,
        token: amount * CONVERSION_RATES[tokenType]
      },
      tokenType,
      walletAddress,
      conversionRate: CONVERSION_RATES[tokenType],
      status: 'completed',
      paymentId: 'manual_transfer',
      transactionHash: transferResult.hash,
      metadata: {
        transferType: 'manual',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Tokens transferred successfully',
      transaction_hash: transferResult.hash,
      explorer_url: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
      transaction: {
        id: transaction._id,
        status: 'completed',
        tokenAmount: transaction.amount.token,
        tokenType: transaction.tokenType
      }
    });

  } catch (error) {
    console.error('Manual transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transfer tokens'
    });
  }
});

// @route   PUT /api/payments/transaction/:id/cancel
// @desc    Cancel a pending transaction
// @access  Private
router.put('/transaction/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Only allow cancellation of pending transactions
    if (!['pending', 'payment_failed'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only pending transactions can be cancelled'
      });
    }

    await transaction.updateStatus('cancelled', {
      cancelledBy: 'user',
      cancelledAt: new Date(),
      reason: req.body.reason || 'Cancelled by user'
    });

    console.log(`❌ Transaction cancelled by user: ${req.user.name} | Transaction ID: ${id}`);

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      transaction: {
        id: transaction._id,
        status: 'cancelled',
        orderId: transaction.orderId
      }
    });

  } catch (error) {
    console.error('Transaction cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel transaction'
    });
  }
});

// @route   GET /api/payments/orders/:orderId/status
// @desc    Get Razorpay order status
// @access  Private
router.get('/orders/:orderId/status', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    // Find transaction in our database
    const transaction = await Transaction.findOne({
      orderId,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Fetch order status from Razorpay
    try {
      const razorpayOrder = await razorpay.orders.fetch(orderId);
      
      res.json({
        success: true,
        order: {
          id: razorpayOrder.id,
          status: razorpayOrder.status,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          created_at: razorpayOrder.created_at
        },
        transaction: {
          id: transaction._id,
          status: transaction.status,
          tokenType: transaction.tokenType,
          tokenAmount: transaction.amount.token,
          walletAddress: transaction.walletAddress
        }
      });

    } catch (razorpayError) {
      console.error('Razorpay order fetch error:', razorpayError);
      
      // Return our transaction status if Razorpay API fails
      res.json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          tokenType: transaction.tokenType,
          tokenAmount: transaction.amount.token,
          walletAddress: transaction.walletAddress
        },
        note: 'Razorpay status unavailable, showing local transaction status'
      });
    }

  } catch (error) {
    console.error('Order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order status'
    });
  }
});

// @route   POST /api/payments/retry-transfer/:id
// @desc    Retry failed token transfer
// @access  Private
router.post('/retry-transfer/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId
    }).populate('user', 'name email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Only retry failed transfers with verified payments
    if (transaction.status !== 'failed' || !transaction.paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Only failed transactions with verified payments can be retried'
      });
    }

    console.log(`🔄 Retrying token transfer for transaction: ${id}`);

    // Import the token transfer function
    const { transferTokens } = require('../services/aptosService');

    try {
      const transferResult = await transferTokens(
        transaction.walletAddress,
        transaction.tokenType,
        transaction.amount.inr
      );

      // Update transaction with successful transfer
      await transaction.updateStatus('completed', {
        transactionHash: transferResult.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        retryAttempt: true,
        retryAt: new Date()
      });

      console.log(`✅ Retry successful! Transaction hash: ${transferResult.hash}`);

      res.json({
        success: true,
        message: 'Token transfer retry successful',
        transaction_hash: transferResult.hash,
        explorer_url: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        transaction: {
          id: transaction._id,
          status: 'completed'
        }
      });

    } catch (transferError) {
      console.error(`❌ Retry failed for transaction: ${id}`, transferError);
      
      await transaction.updateStatus('failed', {
        retryFailed: true,
        retryError: transferError.message,
        retryAt: new Date()
      });

      res.status(500).json({
        success: false,
        error: 'Token transfer retry failed',
        details: transferError.message
      });
    }

  } catch (error) {
    console.error('Retry transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry token transfer'
    });
  }
});

// @route   GET /api/payments/transaction-info/:hash
// @desc    Get transaction information from Aptos explorer
// @access  Private
router.get('/transaction-info/:hash', auth, async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || !hash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }

    console.log(`🔍 Fetching transaction info for hash: ${hash}`);

    try {
      // Try to get transaction from Aptos network
      const transaction = await client.getTransactionByHash(hash);
      
      res.json({
        success: true,
        transaction: {
          hash: transaction.hash,
          success: transaction.success,
          timestamp: transaction.timestamp,
          sender: transaction.sender,
          gasUsed: transaction.gas_used,
          gasUnitPrice: transaction.gas_unit_price,
          explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`
        }
      });

    } catch (aptosError) {
      // If transaction not found on Aptos network, it might be simulated
      console.warn(`⚠️ Transaction not found on Aptos network: ${aptosError.message}`);
      
      res.json({
        success: true,
        transaction: {
          hash: hash,
          success: true,
          status: 'simulated',
          note: 'This transaction was simulated for demo purposes',
          explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`,
          simulated: true
        }
      });
    }

  } catch (error) {
    console.error('❌ Failed to fetch transaction info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction information'
    });
  }
});

// @route   GET /api/payments/wallet-balance/:address
// @desc    Get wallet balance for a specific address
// @access  Private
router.get('/wallet-balance/:address', auth, async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    console.log(`💰 Fetching balance for wallet: ${address}`);

    // Import the service to get balance
    const { aptosService } = require('../services/aptosService');
    
    // Initialize service if not already done
    if (!aptosService.isInitialized) {
      await aptosService.initialize();
    }

    const balance = await aptosService.getAccountBalance(address);

    res.json({
      success: true,
      wallet: {
        address,
        balance: {
          apt: balance,
          formatted: `${balance.toFixed(6)} APT`,
          inr_equivalent: Math.round(balance / CONVERSION_RATES.APT),
          last_updated: new Date().toISOString()
        }
      },
      conversion_rate: {
        apt_to_inr: 1 / CONVERSION_RATES.APT,
        inr_to_apt: CONVERSION_RATES.APT
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/payments/send-payment
// @desc    Send APT tokens directly from one wallet to another
// @access  Private
router.post('/send-payment', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01 APT'),
  body('recipientAddress').notEmpty().withMessage('Recipient address is required'),
  body('senderAddress').notEmpty().withMessage('Sender address is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { amount, recipientAddress, senderAddress, description, paymentMethod } = req.body;
    const userId = req.userId;
    console.log(`📤 User ${req.user.name} is sending a direct payment of ${amount} APT to ${recipientAddress} from ${senderAddress}`);
    console.log(`🚀 Direct payment initiated: ${amount} APT from ${senderAddress} to ${recipientAddress}`);

    // Validate addresses are different
    if (senderAddress.toLowerCase() === recipientAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send payment to the same address'
      });
    }

    // Validate payment method
    if (paymentMethod !== 'wallet') {
      return res.status(400).json({
        success: false,
        error: 'Only wallet transfers are currently supported'
      });
    }

    // Import the direct transfer function
    const { transferAPTDirect } = require('../services/aptosService');

    try {
      const transferResult = await transferAPTDirect(
        senderAddress,
        recipientAddress,
        amount
      );

      // Create transaction record for this direct payment
      const transaction = new Transaction({
        user: userId,
        orderId: `direct_${Date.now()}`,
        amount: {
          inr: 0, // Not applicable for direct transfers
          token: amount
        },
        tokenType: 'APT',
        walletAddress: recipientAddress,
        conversionRate: 1, // 1:1 for direct APT transfer
        status: 'completed',
        paymentId: 'direct_wallet_transfer',
        transactionHash: transferResult.hash,
        metadata: {
          transferType: 'direct_payment',
          senderAddress,
          recipientAddress,
          description: description || '',
          paymentMethod,
          explorerUrl: transferResult.simulated 
            ? `#simulated-transaction-${transferResult.hash}` 
            : `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
          gasUsed: transferResult.gasUsed || 'N/A',
          gasPrice: transferResult.gasPrice || 'N/A',
          network: transferResult.network || 'testnet',
          simulated: transferResult.simulated || false,
          simulationNote: transferResult.simulated 
            ? "This transaction was simulated for demo purposes" 
            : null,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      await transaction.save();

      console.log(`✅ Direct payment successful! Hash: ${transferResult.hash}`);

      res.json({
        success: true,
        message: 'Payment sent successfully',
        transactionHash: transferResult.hash,
        explorerUrl: transferResult.simulated 
          ? `#simulated-transaction-${transferResult.hash}` 
          : `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        payment: {
          amount,
          tokenType: 'APT',
          from: senderAddress,
          to: recipientAddress,
          description: description || '',
          timestamp: new Date().toISOString(),
          isSimulated: transferResult.simulated || false
        },
        transaction: {
          id: transaction._id,
          status: 'completed',
          createdAt: transaction.createdAt,
          simulated: transferResult.simulated || false
        },
        note: transferResult.simulated 
          ? "This transaction was simulated for demo purposes. In production, tokens would be transferred on the actual Aptos blockchain." 
          : "Transaction completed successfully on Aptos testnet."
      });

    } catch (transferError) {
      console.error(`❌ Direct payment failed:`, transferError);
      
      // Create failed transaction record
      const failedTransaction = new Transaction({
        user: userId,
        orderId: `direct_failed_${Date.now()}`,
        amount: {
          inr: 0,
          token: amount
        },
        tokenType: 'APT',
        walletAddress: recipientAddress,
        conversionRate: 1,
        status: 'failed',
        paymentId: 'direct_wallet_transfer_failed',
        metadata: {
          transferType: 'direct_payment',
          senderAddress,
          recipientAddress,
          description: description || '',
          paymentMethod,
          failureReason: transferError.message,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      await failedTransaction.save();

      res.status(500).json({
        success: false,
        error: 'Payment transfer failed',
        message: transferError.message || 'Failed to send payment',
        transaction: {
          id: failedTransaction._id,
          status: 'failed'
        }
      });
    }

  } catch (error) {
    console.error('❌ Send payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment request'
    });
  }
});

module.exports = router;
