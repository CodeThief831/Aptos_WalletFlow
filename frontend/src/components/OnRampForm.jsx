import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAuth } from '../contexts/useAuth';
import useRazorpay from '../hooks/useRazorpay';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3001';

const OnRampForm = ({ onShowAuth }) => {
  const { connected, account } = useWallet();
  const { isAuthenticated, user, updateUser } = useAuth();
  const { isLoaded: razorpayLoaded, createPayment } = useRazorpay();
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('APT');
  const [loading, setLoading] = useState(false);
  const [conversionRates, setConversionRates] = useState({
    APT: 0.1,    // 1 INR = 0.1 APT
    USDC: 0.012  // 1 INR = 0.012 USDC
  });
  const [balance, setBalance] = useState({ APT: 0, USDC: 0 });

  // Fetch conversion rates - using static rates for now
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // In production, you would fetch real-time rates from an API
        // For now, using static rates
        setConversionRates({
          APT: 0.1,    // 1 INR = 0.1 APT (example rate)
          USDC: 0.012  // 1 INR = 0.012 USDC (example rate)
        });
      } catch (error) {
        console.error('Failed to fetch rates:', error);
        toast.error('Failed to fetch conversion rates');
      }
    };
    fetchRates();
  }, []);

  // Fetch wallet balance - placeholder for now
  const fetchBalance = useCallback(async () => {
    if (connected && account?.address) {
      try {
        // Placeholder balance - in production, you would fetch from Aptos blockchain
        setBalance({
          APT: Math.random() * 100,  // Random balance for demo
          USDC: Math.random() * 1000
        });
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    }
  }, [connected, account?.address]);

  useEffect(() => {
    fetchBalance();
  }, [connected, account?.address, fetchBalance]);

  const calculateTokenAmount = () => {
    if (!amount || !conversionRates[selectedToken]) return 0;
    return (parseFloat(amount) * conversionRates[selectedToken]).toFixed(6);
  };

  const handlePayment = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      toast.error('Please login first to make a purchase');
      onShowAuth?.();
      return;
    }

    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!account?.address) {
      toast.error('Wallet address not available');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) < 10) {
      toast.error('Minimum amount is ₹10');
      return;
    }

    setLoading(true);

    try {
      // Update user's wallet address if not already set
      if (user.walletAddress !== account.address) {
        updateUser({ walletAddress: account.address });
      }

      // Step 1: Create Razorpay order
      const token = localStorage.getItem('token');
      const orderResponse = await axios.post(`${API_BASE_URL}/api/payments/create-order`, {
        amount: parseFloat(amount),
        tokenType: selectedToken,
        walletAddress: account.address
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!orderResponse.data.success) {
        throw new Error('Failed to create order');
      }

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: orderResponse.data.key,
        amount: orderResponse.data.amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Aptos OnRamp',
        description: `Buy ${selectedToken} with INR`,
        order_id: orderResponse.data.order_id,
        handler: async (response) => {
          try {
            const verifyResponse = await axios.post(`${API_BASE_URL}/api/payments/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (verifyResponse.data.success) {
              const userInfo = verifyResponse.data.user;
              const explorerUrl = verifyResponse.data.explorer_url;
              
              toast.success(
                <div>
                  <div className="font-semibold">🎉 Payment Successful!</div>
                  <div>Hello {userInfo.name}!</div>
                  <div>You received {userInfo.tokenReceived} {userInfo.tokenType}</div>
                  <div className="text-xs mt-1">
                    Wallet: {userInfo.walletAddress?.substring(0, 8)}...
                  </div>
                  {explorerUrl && (
                    <a 
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs underline mt-1 block"
                    >
                      View on Aptos Explorer
                    </a>
                  )}
                </div>,
                { duration: 8000 }
              );

              // Refresh balance after transaction
              setTimeout(() => {
                fetchBalance();
              }, 2000);

              // Reset form
              setAmount('');
            } else {
              toast.error('Payment verification failed');
            }
          } catch (verifyError) {
            console.error('Verification error:', verifyError);
            const errorMsg = verifyError.response?.data?.error || 'Payment processed but token transfer failed. Please contact support.';
            toast.error(errorMsg);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        theme: {
          color: '#8B5CF6'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.error('Payment cancelled');
          }
        }
      };

      // Use the Razorpay hook for better error handling
      try {
        const rzp = createPayment(options);
        rzp.open();
      } catch (razorpayError) {
        toast.error(razorpayError.message);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create payment order';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4 4-4 .257-.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600">Please connect your Petra wallet to start buying crypto with INR</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Buy Crypto with INR</h2>
      
      {/* Wallet Balance Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Your Balance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">{balance.APT.toFixed(4)} APT</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{balance.USDC.toFixed(4)} USDC</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (INR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              min="10"
              className="input-field pl-8"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimum: ₹10</p>
        </div>

        {/* Token Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Token
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="input-field"
          >
            <option value="APT">APT (Aptos)</option>
            <option value="USDC">USDC (Test)</option>
          </select>
        </div>

        {/* Conversion Preview */}
        {amount && conversionRates[selectedToken] && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">You will receive:</span>
              <span className="font-semibold text-blue-900">
                {calculateTokenAmount()} {selectedToken}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-blue-600">
                Rate: 1 INR = {conversionRates[selectedToken]} {selectedToken}
              </span>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading || !amount || parseFloat(amount) < 10 || !razorpayLoaded}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            loading || !amount || parseFloat(amount) < 10 || !razorpayLoaded
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : !razorpayLoaded ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-300 mr-2"></div>
              Loading Payment System...
            </div>
          ) : (
            `Pay ₹${amount || '0'} with Razorpay`
          )}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Testnet Only:</strong> This is a demo application using Aptos testnet. 
          No real money is involved. Use Razorpay test mode for payments.
        </p>
      </div>
    </div>
  );
};

export default OnRampForm;
