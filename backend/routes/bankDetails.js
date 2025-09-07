const express = require('express');
const router = express.Router();
const BankDetails = require('../models/BankDetails');
const auth = require('../middleware/auth');

// Get all bank details for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const bankDetails = await BankDetails.find({ 
      userId: req.user.id, 
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      bankDetails
    });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bank details'
    });
  }
});

// Get default bank details for the authenticated user
router.get('/default', auth, async (req, res) => {
  try {
    const defaultBank = await BankDetails.findOne({ 
      userId: req.user.id, 
      isDefault: true,
      isActive: true 
    });

    if (!defaultBank) {
      return res.status(404).json({
        success: false,
        error: 'No default bank details found'
      });
    }

    res.json({
      success: true,
      bankDetails: defaultBank
    });
  } catch (error) {
    console.error('Error fetching default bank details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default bank details'
    });
  }
});

// Add new bank details
router.post('/', auth, async (req, res) => {
  try {
    const {
      bankName,
      accountNumber,
      accountHolderName,
      ifscCode,
      accountType,
      bankCountry,
      isDefault,
      nickname
    } = req.body;

    // Validate required fields
    if (!bankName || !accountNumber || !accountHolderName || !ifscCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bankName, accountNumber, accountHolderName, ifscCode'
      });
    }

    // Check if account number already exists for this user
    const existingBank = await BankDetails.findOne({
      userId: req.user.id,
      accountNumber,
      isActive: true
    });

    if (existingBank) {
      return res.status(400).json({
        success: false,
        error: 'Bank account already exists'
      });
    }

    // If this is the first bank account, make it default
    const existingBanksCount = await BankDetails.countDocuments({
      userId: req.user.id,
      isActive: true
    });

    const newBankDetails = new BankDetails({
      userId: req.user.id,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolderName: accountHolderName.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountType: accountType || 'savings',
      bankCountry: bankCountry || 'India',
      isDefault: existingBanksCount === 0 ? true : (isDefault || false),
      nickname: nickname?.trim()
    });

    await newBankDetails.save();

    res.status(201).json({
      success: true,
      message: 'Bank details added successfully',
      bankDetails: newBankDetails
    });
  } catch (error) {
    console.error('Error adding bank details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bank details'
    });
  }
});

// Update bank details
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the bank details belonging to the authenticated user
    const bankDetails = await BankDetails.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true
    });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        error: 'Bank details not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['bankName', 'accountHolderName', 'ifscCode', 'accountType', 'isDefault', 'nickname'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (typeof updates[field] === 'string') {
          bankDetails[field] = updates[field].trim();
        } else {
          bankDetails[field] = updates[field];
        }
      }
    });

    await bankDetails.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      bankDetails
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bank details'
    });
  }
});

// Set default bank account
router.put('/:id/set-default', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the bank details belonging to the authenticated user
    const bankDetails = await BankDetails.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true
    });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        error: 'Bank details not found'
      });
    }

    // Set this as default (pre-save middleware will handle unsetting others)
    bankDetails.isDefault = true;
    await bankDetails.save();

    res.json({
      success: true,
      message: 'Default bank account updated successfully',
      bankDetails
    });
  } catch (error) {
    console.error('Error setting default bank:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default bank account'
    });
  }
});

// Delete bank details (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the bank details belonging to the authenticated user
    const bankDetails = await BankDetails.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true
    });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        error: 'Bank details not found'
      });
    }

    // Check if this is the only bank account
    const activeBanksCount = await BankDetails.countDocuments({
      userId: req.user.id,
      isActive: true
    });

    if (activeBanksCount === 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the only bank account. Add another bank account first.'
      });
    }

    // Soft delete
    bankDetails.isActive = false;
    bankDetails.isDefault = false;
    await bankDetails.save();

    // If this was the default, make another one default
    if (bankDetails.isDefault) {
      const nextBank = await BankDetails.findOne({
        userId: req.user.id,
        isActive: true,
        _id: { $ne: id }
      }).sort({ createdAt: -1 });

      if (nextBank) {
        nextBank.isDefault = true;
        await nextBank.save();
      }
    }

    res.json({
      success: true,
      message: 'Bank details deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete bank details'
    });
  }
});

module.exports = router;
