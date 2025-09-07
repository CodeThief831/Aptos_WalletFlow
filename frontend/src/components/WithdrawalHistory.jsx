import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3001';

const WithdrawalHistory = () => {
  const { isAuthenticated } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');

  // Fetch withdrawal history
  const fetchWithdrawals = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/offramp/withdrawals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setWithdrawals(response.data.withdrawals);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      toast.error('Failed to fetch withdrawal history');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const getStatusBadge = (status) => {
    const statusStyles = {
      'withdrawal_requested': 'bg-yellow-100 text-yellow-800',
      'transfer_verified': 'bg-blue-100 text-blue-800',
      'bank_transfer_initiated': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      'withdrawal_requested': 'Awaiting Transfer',
      'transfer_verified': 'Transfer Verified',
      'bank_transfer_initiated': 'Bank Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVerifyTransfer = async () => {
    if (!transactionHash || !selectedWithdrawal) {
      toast.error('Please enter a valid transaction hash');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/offramp/verify-token-transfer`, {
        withdrawalId: selectedWithdrawal._id,
        transactionHash
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Transaction verified successfully! Bank transfer will be initiated shortly.');
        setShowVerifyModal(false);
        setTransactionHash('');
        setSelectedWithdrawal(null);
        fetchWithdrawals(); // Refresh the list
      }
    } catch (error) {
      console.error('Verification failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to verify transaction';
      toast.error(errorMsg);
    }
  };

  const handleConfirmPayment = async (withdrawalId) => {
    if (!confirm('Are you sure you want to confirm payment for this withdrawal? This will simulate bank transfer completion.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/offramp/confirm-payment/${withdrawalId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success(
          <div>
            <div className="font-semibold">💰 Payment Confirmed!</div>
            <div>₹{response.data.paymentDetails.amount} transferred to your bank</div>
            <div className="text-xs mt-1">Razorpay ID: {response.data.razorpayConfirmation.paymentId}</div>
          </div>,
          { duration: 8000 }
        );
        fetchWithdrawals(); // Refresh the list
      }
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to confirm payment';
      toast.error(errorMsg);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    if (!confirm('Are you sure you want to cancel this withdrawal request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/offramp/withdrawal/${withdrawalId}/cancel`, {
        reason: 'Cancelled by user'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Withdrawal request cancelled successfully');
        fetchWithdrawals(); // Refresh the list
      }
    } catch (error) {
      console.error('Cancel failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to cancel withdrawal';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading withdrawal history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Withdrawal History</h2>
        <button
          onClick={fetchWithdrawals}
          className="btn btn-secondary btn-sm"
        >
          Refresh
        </button>
      </div>

      {withdrawals.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-dark-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">No Withdrawals Yet</h3>
          <p className="text-gray-400">You haven't made any withdrawal requests yet.</p>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal._id} className="border border-dark-700 rounded-lg p-6 hover:bg-dark-800/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-semibold text-white">
                        {withdrawal.amount.token} {withdrawal.tokenType}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-xl font-semibold text-green-400">
                        ₹{withdrawal.metadata?.netINR || withdrawal.amount.inr}
                      </span>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Created: {formatDate(withdrawal.createdAt)}
                    </div>
                    {withdrawal.metadata?.bankDetails && (
                      <div className="text-sm text-gray-500">
                        Bank: {withdrawal.metadata.bankDetails.bankName} 
                        (***{withdrawal.metadata.bankDetails.accountNumber.slice(-4)})
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {withdrawal.status === 'withdrawal_requested' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowVerifyModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          Verify Transfer
                        </button>
                        <button
                          onClick={() => handleCancelWithdrawal(withdrawal._id)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {withdrawal.status === 'transfer_verified' && (
                      <button
                        onClick={() => handleConfirmPayment(withdrawal._id)}
                        className="btn btn-success btn-sm"
                      >
                        Confirm Payment
                      </button>
                    )}
                  </div>
                </div>

                {withdrawal.transactionHash && (
                  <div className="mt-4 p-3 bg-dark-800/50 rounded-lg">
                    <div className="text-sm">
                      <span className="text-gray-400">Transaction Hash: </span>
                      <a 
                        href={`https://explorer.aptoslabs.com/txn/${withdrawal.transactionHash}?network=testnet`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline break-all"
                      >
                        {withdrawal.transactionHash}
                      </a>
                    </div>
                  </div>
                )}

                {withdrawal.status === 'withdrawal_requested' && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      <strong>Next Step:</strong> Transfer {withdrawal.amount.token} {withdrawal.tokenType} to our withdrawal address and provide the transaction hash.
                    </div>
                  </div>
                )}
                
                {withdrawal.status === 'transfer_verified' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <strong>Crypto Transfer Verified!</strong> Click "Confirm Payment" to complete the bank transfer simulation.
                    </div>
                  </div>
                )}
                
                {withdrawal.status === 'completed' && withdrawal.metadata?.razorpayPaymentId && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-800">
                      <div><strong>✓ Payment Completed!</strong></div>
                      <div>Razorpay Payment ID: {withdrawal.metadata.razorpayPaymentId}</div>
                      <div>Amount Transferred: ₹{withdrawal.metadata.netINR}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verify Transfer Modal */}
      {showVerifyModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Verify Token Transfer
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Transfer {selectedWithdrawal.amount.token} {selectedWithdrawal.tokenType} to:
                </p>
                <div className="p-3 bg-gray-100 rounded-lg text-sm font-mono break-all">
                  0x1234567890abcdef1234567890abcdef12345678
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the transaction hash from your wallet
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleVerifyTransfer}
                disabled={!transactionHash}
                className="flex-1 btn btn-primary"
              >
                Verify Transfer
              </button>
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setTransactionHash('');
                  setSelectedWithdrawal(null);
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalHistory;
