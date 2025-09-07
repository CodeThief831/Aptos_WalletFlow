const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../config/jwt');
const { auth } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const handleValidationErrors = require('../middleware/validation');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { name, email, password, phone, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if phone number is already registered
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      walletAddress: walletAddress || null
    });

    await user.save();

    // Generate tokens
    const token = generateToken({ userId: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      refreshToken,
      user: user.fullProfile
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const token = generateToken({ userId: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: user.fullProfile
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.fullProfile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile (alias for /me)
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.fullProfile
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('walletAddress')
    .optional()
    .trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, phone, walletAddress } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone) {
      // Check if phone number is already used by another user
      const existingPhone = await User.findOne({ 
        phone, 
        _id: { $ne: req.userId } 
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is already registered by another user'
        });
      }
      updates.phone = phone;
    }
    if (walletAddress !== undefined) updates.walletAddress = walletAddress;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.fullProfile
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.userId).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client should remove token)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // But we can still track this for analytics
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address (placeholder for future implementation)
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // For now, just return success - implement proper email verification later
    res.json({
      success: true,
      message: 'Email verification successful',
      note: 'Email verification is currently a placeholder feature'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset (placeholder for future implementation)
// @access  Public
router.post('/forgot-password', passwordResetLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // For now, just return success - implement proper password reset later
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      note: 'Password reset functionality is currently a placeholder feature'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// @route   PUT /api/auth/bank-details
// @desc    Update user bank details
// @access  Private
router.put('/bank-details', auth, [
  body('accountHolderName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be between 2 and 100 characters'),
  body('accountNumber')
    .trim()
    .isLength({ min: 9, max: 18 })
    .isNumeric()
    .withMessage('Account number must be between 9 and 18 digits'),
  body('ifscCode')
    .trim()
    .isLength({ min: 11, max: 11 })
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Please provide a valid IFSC code'),
  body('bankName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be between 2 and 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        bankDetails: {
          accountHolderName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          bankName,
          isVerified: false // Reset verification status when details are updated
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      bankDetails: user.bankDetails
    });

  } catch (error) {
    console.error('Bank details update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bank details'
    });
  }
});

// @route   GET /api/auth/bank-details
// @desc    Get user bank details
// @access  Private
router.get('/bank-details', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    res.json({
      success: true,
      bankDetails: user.bankDetails || null
    });

  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bank details'
    });
  }
});

// @route   GET /api/auth/user-stats
// @desc    Get user account statistics
// @access  Private
router.get('/user-stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = req.user;

    // Get user's transaction count and total spent
    const Transaction = require('../models/Transaction');
    
    const transactionStats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          completedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount.inr', 0]
            }
          },
          totalTokensReceived: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount.token', 0]
            }
          }
        }
      }
    ]);

    const stats = transactionStats[0] || {
      totalTransactions: 0,
      completedTransactions: 0,
      totalSpent: 0,
      totalTokensReceived: 0
    };

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        walletAddress: user.walletAddress,
        joinedAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      },
      stats: {
        ...stats,
        successRate: stats.totalTransactions > 0 
          ? ((stats.completedTransactions / stats.totalTransactions) * 100).toFixed(2)
          : 0
      },
      account: {
        hasWallet: !!user.walletAddress,
        hasCompletedTransactions: stats.completedTransactions > 0,
        accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)) // days
      }
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;
