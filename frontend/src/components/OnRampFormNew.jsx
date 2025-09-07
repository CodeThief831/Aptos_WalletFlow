import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAuth } from '../contexts/useAuth';
import useRazorpay from '../hooks/useRazorpay';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const OnRampFormNew = () => {
  const { connected, account, connect, disconnect } = useWallet();
  const { isAuthenticated, user, updateUser } = useAuth();
  const { isLoaded: razorpayLoaded, createPayment } = useRazorpay();
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    selectedToken: 'APT'
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [gasEstimation, setGasEstimation] = useState(null);
  const [conversionRates, setConversionRates] = useState({
    APT: { token_per_inr: 0.1, inr_per_token: 10 },
    USDC: { token_per_inr: 0.012, inr_per_token: 83.33 }
  });
  const [transactionResult, setTransactionResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch conversion rates from backend
  const fetchConversionRates = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/payments/rates`);
      if (response.data.success) {
        setConversionRates(response.data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch rates:', error);
      toast.error('Failed to fetch conversion rates');
    }
  }, []);

  // Fetch gas estimation
  const fetchGasEstimation = useCallback(async () => {
    if (!formData.amount || !connected || !account?.address) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/payments/estimate-gas`, {
        amount: parseFloat(formData.amount),
        tokenType: formData.selectedToken,
        walletAddress: account.address
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setGasEstimation(response.data.gasEstimation);
      }
    } catch (error) {
      console.error('Failed to fetch gas estimation:', error);
    }
  }, [formData.amount, formData.selectedToken, connected, account?.address]);

  useEffect(() => {
    fetchConversionRates();
  }, [fetchConversionRates]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.amount && parseFloat(formData.amount) >= 10) {
        fetchGasEstimation();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [formData.amount, formData.selectedToken, fetchGasEstimation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuickAmount = (amount) => {
    setFormData(prev => ({
      ...prev,
      amount: amount.toString()
    }));
  };

  const calculateTokenAmount = () => {
    if (!formData.amount || !conversionRates[formData.selectedToken]) return '0';
    const rate = conversionRates[formData.selectedToken].token_per_inr;
    return (parseFloat(formData.amount) * rate).toFixed(6);
  };

  const handleWalletConnect = async () => {
    try {
      await connect('Petra');
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const handlePayment = async () => {
    // Validation checks
    if (!isAuthenticated) {
      toast.error('Please login first to make a purchase');
      return;
    }

    if (!connected || !account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(formData.amount) < 10) {
      toast.error('Minimum amount is ₹10');
      return;
    }

    setLoading(true);
    setTransactionResult(null);

    try {
      // Update user's wallet address if not set
      if (user.walletAddress !== account.address) {
        await updateUser({ walletAddress: account.address });
      }

      // Step 1: Create Razorpay order
      const token = localStorage.getItem('token');
      const orderResponse = await axios.post(`${API_BASE_URL}/payments/create-order`, {
        amount: parseFloat(formData.amount),
        tokenType: formData.selectedToken,
        walletAddress: account.address
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.error || 'Failed to create order');
      }

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: orderResponse.data.key,
        amount: orderResponse.data.amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Aptos OnRamp',
        description: `Buy ${formData.selectedToken} with INR`,
        order_id: orderResponse.data.order_id,
        handler: async (response) => {
          await handlePaymentSuccess(response, token);
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
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create payment order';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (razorpayResponse, token) => {
    try {
      // Step 3: Verify payment and transfer tokens
      const verifyResponse = await axios.post(`${API_BASE_URL}/payments/verify-payment`, {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (verifyResponse.data.success) {
        const result = verifyResponse.data;
        
        // Set transaction result for display
        setTransactionResult({
          success: true,
          amountPaid: result.user.amountPaid,
          tokenReceived: result.user.tokenReceived,
          tokenType: result.user.tokenType,
          walletAddress: result.user.walletAddress,
          transactionHash: result.transaction_hash,
          explorerUrl: result.explorer_url,
          paymentId: result.payment_id
        });

        // Show success modal
        setShowSuccessModal(true);

        // Reset form
        setFormData({
          amount: '',
          selectedToken: 'APT'
        });

        toast.success('🎉 Payment successful! Tokens transferred to your wallet.');

      } else {
        throw new Error(verifyResponse.data.error || 'Payment verification failed');
      }
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      const errorMsg = verifyError.response?.data?.error || 'Payment processed but token transfer failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const SuccessModal = ({ result, onClose }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-glow">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Tokens Received!</h3>
          <p className="text-gray-400">Your transaction has been completed successfully</p>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Amount Paid:</span>
                <div className="font-semibold text-white">₹{result.amountPaid}</div>
              </div>
              <div>
                <span className="text-gray-400">Tokens Received:</span>
                <div className="font-semibold text-gradient">{result.tokenReceived} {result.tokenType}</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <span className="text-gray-400 text-sm">Aptos Address:</span>
            <div className="font-mono text-sm break-all text-purple-400 mt-1">{result.walletAddress}</div>
          </div>

          {result.explorerUrl && (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>View on Aptos Explorer</span>
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary w-full mt-6"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (!connected) {
    return (
      <div className="card-glass p-8 max-w-md mx-auto">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto flex items-center justify-center animate-pulse-glow">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6">Connect your Petra wallet to start buying crypto with INR</p>
          </div>
          <button
            onClick={handleWalletConnect}
            className="btn btn-primary w-full"
          >
            Connect Petra Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-glass p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Fiat-to-Crypto On-Ramp
        </h2>
        
        {/* Connected Wallet Info */}
        <div className="status-connected p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Wallet Connected</div>
              <div className="text-xs font-mono opacity-80">
                {account?.address?.substring(0, 8)}...
              </div>
            </div>
            <button
              onClick={disconnect}
              className="text-sm underline hover:no-underline"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Amount Buttons */}
          <div>
            <label className="form-label mb-3">Quick Select</label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 2500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                  className={`btn btn-sm ${
                    formData.amount === amount.toString() 
                      ? 'btn-primary' 
                      : 'btn-secondary'
                  }`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label className="form-label">INR Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="1000"
                min="10"
                className="input pl-8"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum: ₹10</p>
          </div>

          {/* Token Selection */}
          {/* <div className="form-group">
            <label className="form-label">Select Token</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { 
                  value: 'APT', 
                  label: 'APT', 
                  name: 'Aptos',
                  icon: (
                    <div className="w-8 h-8 bg-gradient-to-r from-aptos-500 to-aptos-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">A</span>
                    </div>
                  )
                },
                { 
                  value: 'USDC', 
                  label: 'USDC', 
                  name: 'USD Coin',
                  icon: (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">$</span>
                    </div>
                  )
                }
              ].map((token) => (
                <button
                  key={token.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, selectedToken: token.value }))}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    formData.selectedToken === token.value
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-dark-600 bg-dark-800/50 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {token.icon}
                    <div className="text-left">
                      <div className="font-semibold text-white">{token.label}</div>
                      <div className="text-xs text-gray-400">{token.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div> */}

          {/* Conversion Preview */}
          {formData.amount && (
            <div className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">You will receive:</span>
                <span className="font-bold text-gradient text-lg">
                  {calculateTokenAmount()} {formData.selectedToken}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Exchange Rate: 1 INR = {conversionRates[formData.selectedToken]?.token_per_inr} {formData.selectedToken}
              </div>
            </div>
          )}

          {/* Gas Fee Estimation */}
          {gasEstimation && (
            <div className="card p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Estimated Gas Fee:</span>
                <span className="font-semibold text-white">
                  {gasEstimation.estimatedGas} APT (~₹{gasEstimation.gasFeeInINR})
                </span>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-white">Razorpay</div>
                    <div className="text-sm text-gray-400">UPI, Cards, Net Banking</div>
                  </div>
                </div>
                <div className="text-emerald-400 text-sm font-medium">Secure</div>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={loading || !formData.amount || parseFloat(formData.amount) < 10 || !isAuthenticated || !razorpayLoaded}
            className={`btn w-full py-4 text-lg font-semibold ${
              loading || !formData.amount || parseFloat(formData.amount) < 10 || !isAuthenticated || !razorpayLoaded
                ? 'btn-secondary opacity-50 cursor-not-allowed'
                : 'btn-primary glow-purple'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 spinner"></div>
                <span>Processing Payment...</span>
              </div>
            ) : !razorpayLoaded ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 spinner"></div>
                <span>Loading Payment System...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Pay with Razorpay - ₹{formData.amount || '0'}</span>
              </div>
            )}
          </button>
        </div>

        {/* Transaction Result Display */}
        {transactionResult && (
          <div className="mt-6 card p-4">
            <h4 className="font-semibold text-emerald-400 mb-2">Transaction Complete!</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Amount Paid: ₹{transactionResult.amountPaid}</div>
              <div>Tokens Received: {transactionResult.tokenReceived} {transactionResult.tokenType}</div>
              <div>Wallet: {transactionResult.walletAddress?.substring(0, 8)}...</div>
              {transactionResult.explorerUrl && (
                <a
                  href={transactionResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline block"
                >
                  View on Aptos Explorer →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {/* <div className="mt-6 card p-4">
          <p className="text-xs text-yellow-400">
            <strong>Demo Mode:</strong> This is a testnet application. Use Razorpay test mode for payments. 
            No real money or tokens are involved.
          </p>
        </div> */}
      </div>

      {/* Success Modal */}
      {showSuccessModal && transactionResult && (
        <SuccessModal
          result={transactionResult}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
};

export default OnRampFormNew;
