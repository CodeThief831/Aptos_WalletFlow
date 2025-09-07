import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3001';

const BankDetailsManager = ({ onBankDetailsChange, selectedBankId, disabled = false }) => {
  const [bankDetails, setBankDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    accountType: 'savings',
    nickname: ''
  });

  // Fetch saved bank details
  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/bank-details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setBankDetails(response.data.bankDetails);
        
        // Auto-select default bank if no bank is selected
        if (!selectedBankId && response.data.bankDetails.length > 0) {
          const defaultBank = response.data.bankDetails.find(bank => bank.isDefault) || response.data.bankDetails[0];
          onBankDetailsChange(defaultBank);
        }
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch bank details');
      }
    }
  };

  useEffect(() => {
    fetchBankDetails();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new bank details
  const handleAddBank = async (e) => {
    e.preventDefault();
    
    if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName || !formData.ifscCode) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/bank-details`, {
        ...formData,
        isDefault: bankDetails.length === 0 // Make first bank default
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Bank details added successfully');
        await fetchBankDetails();
        setShowAddForm(false);
        setFormData({
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          ifscCode: '',
          accountType: 'savings',
          nickname: ''
        });

        // Auto-select the newly added bank
        onBankDetailsChange(response.data.bankDetails);
      }
    } catch (error) {
      console.error('Error adding bank details:', error);
      toast.error(error.response?.data?.error || 'Failed to add bank details');
    } finally {
      setLoading(false);
    }
  };

  // Set as default bank
  const handleSetDefault = async (bankId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/bank-details/${bankId}/set-default`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Default bank updated');
        await fetchBankDetails();
      }
    } catch (error) {
      console.error('Error setting default bank:', error);
      toast.error('Failed to update default bank');
    }
  };

  // Delete bank details
  const handleDeleteBank = async (bankId) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/bank-details/${bankId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Bank details deleted successfully');
        await fetchBankDetails();
        
        // Clear selection if deleted bank was selected
        const selectedBank = bankDetails.find(bank => bank._id === selectedBankId);
        if (selectedBank && selectedBank._id === bankId) {
          onBankDetailsChange(null);
        }
      }
    } catch (error) {
      console.error('Error deleting bank details:', error);
      toast.error(error.response?.data?.error || 'Failed to delete bank details');
    }
  };

  return (
    <div className="space-y-4">
      {/* Saved Bank Accounts */}
      {bankDetails.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Bank Account
          </label>
          <div className="space-y-2">
            {bankDetails.map((bank) => (
              <div
                key={bank._id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedBankId === bank._id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 bg-dark-800 hover:border-gray-500'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && onBankDetailsChange(bank)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-200">
                        {bank.nickname || bank.bankName}
                      </span>
                      {bank.isDefault && (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {bank.bankName} • ••••{bank.accountNumber.slice(-4)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bank.accountHolderName} • {bank.ifscCode}
                    </div>
                  </div>
                  
                  {!disabled && (
                    <div className="flex items-center space-x-2">
                      {!bank.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(bank._id);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300"
                          title="Set as default"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBank(bank._id);
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                        title="Delete bank account"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Bank Button */}
      {!disabled && (
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {showAddForm ? 'Cancel' : '+ Add New Bank Account'}
        </button>
      )}

      {/* Add Bank Form */}
      {showAddForm && !disabled && (
        <form onSubmit={handleAddBank} className="space-y-4 p-4 bg-dark-800 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Add Bank Account</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="e.g., State Bank of India"
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                placeholder="Full name as per bank records"
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                placeholder="Enter account number"
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleInputChange}
                placeholder="e.g., SBIN0001234"
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                style={{ textTransform: 'uppercase' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Type
              </label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="salary">Salary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nickname (Optional)
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="e.g., Primary SBI"
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              {loading ? 'Adding...' : 'Add Bank Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* No banks message */}
      {bankDetails.length === 0 && !showAddForm && (
        <div className="text-center py-6 bg-dark-800 rounded-lg border border-gray-600">
          <div className="text-gray-400 mb-2">No bank accounts found</div>
          <div className="text-sm text-gray-500">Add a bank account to proceed with withdrawal</div>
        </div>
      )}
    </div>
  );
};

export default BankDetailsManager;
