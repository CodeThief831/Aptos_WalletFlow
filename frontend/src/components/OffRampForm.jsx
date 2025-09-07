import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAuth } from '../contexts/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import BankDetailsManager from './BankDetailsManager';

const API_BASE_URL = 'http://localhost:3001';

const OffRampForm = ({ onShowAuth }) => {
  const { connected, account } = useWallet();
  const { isAuthenticated, logout } = useAuth();
  const [amount, setAmount] = useState('');
  const selectedToken = 'APT'; // Fixed to APT only
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [conversionRates, setConversionRates] = useState({
    APT: 10     // 1 APT = 10 INR
  });
  const [balance, setBalance] = useState({ APT: 1.5 }); // Start with demo balance
  const [walletBalance, setWalletBalance] = useState(null);
  const [estimation, setEstimation] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

  // Helper function to handle API requests with authentication and auto-logout
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast.error('Please login again');
      logout();
      onShowAuth?.();
      return null;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers,
        data: options.data,
        ...options
      });
      
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        logout();
        onShowAuth?.();
        return null;
      }
      throw error;
    }
  }, [logout, onShowAuth]);

  // Fetch conversion rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/offramp/rates`);
        if (response.data.success) {
          const rates = {};
          Object.keys(response.data.rates).forEach(token => {
            rates[token] = response.data.rates[token].inr_per_token;
          });
          setConversionRates(rates);
        }
      } catch (error) {
        console.error('Failed to fetch rates:', error);
        toast.error('Failed to fetch conversion rates');
      }
    };
    fetchRates();
  }, []);

  // Track if we've shown balance toast to avoid spam
  const [balanceToastShown, setBalanceToastShown] = useState(false);

  // Fetch wallet balance from backend API (same as Dashboard)
  const fetchWalletBalance = useCallback(async (address, headers) => {
    try {
      setBalanceLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/payments/wallet-balance/${address}`, { headers });
      
      console.log('API Response:', response.data); // Debug log
      
      if (response.data.success && response.data.wallet) {
        // Store the full wallet response like Dashboard
        setWalletBalance(response.data.wallet);
        
        // Extract APT balance with better error handling
        let aptBalance = 0;
        if (response.data.wallet.balance && typeof response.data.wallet.balance.apt === 'number') {
          aptBalance = response.data.wallet.balance.apt;
        } else if (typeof response.data.wallet.balance === 'number') {
          aptBalance = response.data.wallet.balance;
        } else {
          console.warn('Unexpected balance structure:', response.data.wallet.balance);
          aptBalance = 0;
        }
        
        setBalance({ APT: aptBalance });
        
        console.log(`📊 Wallet Balance Updated from API: ${(aptBalance || 0).toFixed(6)} APT`);
        
        // Only show success toast once per session and if balance > 0
        if (aptBalance > 0 && !balanceToastShown) {
          setBalanceToastShown(true);
          toast.success(
            <div>
              <div className="font-semibold">💰 Balance Loaded</div>
              <div className="text-sm">{(aptBalance || 0).toFixed(6)} APT available</div>
            </div>,
            { duration: 3000 }
          );
        }
      } else {
        // If no wallet data, clear both states
        console.warn('No wallet data in response:', response.data);
        setWalletBalance(null);
        setBalance({ APT: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        logout();
        onShowAuth?.();
      } else if (error.response?.status !== 404) {
        // Don't show error for 404 (wallet not found)
        console.warn('Wallet balance fetch failed, using fallback');
      }
      // Fallback to demo balance on error
      setWalletBalance(null);
      setBalance({ APT: 1.5 });
      if (!balanceToastShown) {
        setBalanceToastShown(true);
        toast.info('Using demo balance: 1.5 APT', { duration: 2000 });
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [balanceToastShown, logout, onShowAuth]);

  // Debounced balance fetching to prevent spam
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const FETCH_COOLDOWN = 5000; // 5 seconds cooldown

  // Fetch wallet balance using connected wallet address
  const fetchBalance = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
      console.log('⏳ Balance fetch skipped - cooldown active');
      return;
    }

    if (connected && account?.address && isAuthenticated && !balanceLoading) {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        logout();
        onShowAuth?.();
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      setLastFetchTime(now);
      await fetchWalletBalance(account.address, headers);
    } else if (connected && account?.address && !isAuthenticated) {
      // If wallet is connected but not authenticated, set a demo balance
      setBalance({ APT: 1.5 }); // Demo balance for testing
      setWalletBalance({ 
        balance: { apt: 1.5, formatted: '1.500000 APT' }
      });
    } else {
      // Clear balance when not connected or not authenticated, but keep demo balance for testing
      setWalletBalance(null);
      if (!connected) {
        setBalance({ APT: 0 });
      } else {
        // If wallet connected but not authenticated, keep demo balance
        setBalance({ APT: 1.5 });
      }
    }
  }, [connected, account?.address, isAuthenticated, fetchWalletBalance, logout, onShowAuth, balanceLoading, lastFetchTime]);

  useEffect(() => {
    fetchBalance();
  }, [connected, account?.address, isAuthenticated, fetchBalance]);

  // Get estimation when amount or token changes
  useEffect(() => {
    const getEstimation = async () => {
      if (amount && parseFloat(amount) > 0 && isAuthenticated) {
        try {
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/offramp/estimate`, {
            method: 'POST',
            data: {
              amount: parseFloat(amount),
              tokenType: selectedToken
            }
          });
          
          if (response?.data.success) {
            setEstimation(response.data.estimation);
          }
        } catch (error) {
          console.error('Failed to get estimation:', error);
          setEstimation(null);
        }
      } else {
        setEstimation(null);
      }
    };

    const debounceTimer = setTimeout(getEstimation, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, selectedToken, isAuthenticated, makeAuthenticatedRequest]);

  const validateBankDetails = () => {
    if (!selectedBank || !selectedBank.accountNumber) {
      toast.error('Please select a bank account first');
      return false;
    }
    return true;
  };

  const showMessage = (type, content) => {
    if (type === 'error') {
      toast.error(content);
    } else if (type === 'success') {
      toast.success(content);
    } else {
      toast(content);
    }
  };

  const handleWithdrawal = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      toast.error('Please login first to create a withdrawal');
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

    if (parseFloat(amount) < 0.01) {
      toast.error('Minimum amount is 0.01 tokens');
      return;
    }

    if (parseFloat(amount) > (balance.APT || 0)) {
      toast.error(`Insufficient APT balance`);
      return;
    }

    if (!validateBankDetails()) {
      return;
    }

    setLoading(true);

    try {
      // Simulate the complete off-ramp process
      await simulateCompleteOfframpProcess();
    } catch (error) {
      console.error('Withdrawal process error:', error);
      toast.error('Transaction processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate complete off-ramp process with database integration
  const simulateCompleteOfframpProcess = async () => {
    const withdrawalAmount = parseFloat(amount);
    const expectedINR = withdrawalAmount * conversionRates.APT;
    const processingFee = Math.max(expectedINR * 0.025, 5); // 2.5% fee, minimum ₹5

    try {
      // Step 1: Create withdrawal request in database
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/offramp/create-withdrawal`, {
        method: 'POST',
        data: {
          amount: withdrawalAmount,
          tokenType: selectedToken,
          walletAddress: account.address
        }
      });

      if (!response?.data.success) {
        throw new Error(response?.data.error || 'Failed to create withdrawal');
      }

      const withdrawalId = response.data.withdrawalId;

      // Show initial success
      toast.success(
        <div>
          <div className="font-semibold">🏦 Withdrawal Request Created!</div>
          <div>Amount: {amount} APT → ₹{response.data.details.netINR}</div>
          <div className="text-xs mt-1">Withdrawal ID: #{withdrawalId}</div>
        </div>,
        { duration: 3000 }
      );

      // Step 2: Simulate token transfer delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.loading(
        <div>
          <div className="font-semibold">🔄 Processing Token Transfer...</div>
          <div className="text-xs">Transferring {amount} APT to withdrawal address</div>
        </div>,
        { id: 'transfer-sim', duration: 3000 }
      );

      // Generate a mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(16, '0')}${Math.random().toString(16).slice(2).padStart(16, '0')}${Math.random().toString(16).slice(2).padStart(16, '0')}${Math.random().toString(16).slice(2).padStart(16, '0')}`;

      // Step 3: Verify transaction in database
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const verifyResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/offramp/verify-token-transfer`, {
          method: 'POST',
          data: {
            withdrawalId,
            transactionHash: mockTxHash
          }
        });

        if (!verifyResponse?.data.success) {
          throw new Error('Transaction verification failed');
        }

        toast.dismiss('transfer-sim');
        toast.success(
          <div>
            <div className="font-semibold">✅ Transaction Verified!</div>
            <div className="text-xs">Hash: {mockTxHash.slice(0, 16)}...</div>
            <div className="text-xs">Saved to database successfully</div>
          </div>,
          { duration: 3000 }
        );

        // Step 4: Simulate bank transfer processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        toast.loading(
          <div>
            <div className="font-semibold">🏦 Processing Bank Transfer...</div>
            <div className="text-xs">Initiating transfer to your bank account</div>
          </div>,
          { id: 'bank-sim', duration: 4000 }
        );

        // Step 5: Complete the payment confirmation
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        try {
          // Update transaction status to crypto_verified first
          const updateResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/offramp/withdrawal/${withdrawalId}`, {
            method: 'GET'
          });

          if (updateResponse?.data.success) {
            // Update the withdrawal status manually to crypto_verified for demo
            const withdrawal = updateResponse.data.withdrawal;
            withdrawal.status = 'crypto_verified';
            
            // Now confirm payment
            const paymentResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/offramp/confirm-payment/${withdrawalId}`, {
              method: 'POST'
            });

            toast.dismiss('bank-sim');
            
            if (paymentResponse?.data.success) {
              // Final success notification
              toast.success(
                <div>
                  <div className="font-semibold">🎉 Transfer Completed!</div>
                  <div>₹{response.data.details.netINR} sent to your bank account</div>
                  <div className="text-xs mt-1">
                    Bank: {selectedBank?.bankName} (***{selectedBank?.accountNumber?.slice(-4)})
                  </div>
                  <div className="text-xs">Reference: {paymentResponse.data.razorpayConfirmation?.paymentId || 'SIM-' + Date.now()}</div>
                  <div className="text-xs text-green-400">✅ Saved to database</div>
                </div>,
                { duration: 8000 }
              );

              // Reset form and update balance simulation
              setAmount('');
              setEstimation(null);
              
              // Simulate balance reduction
              setBalance(prev => ({
                ...prev,
                APT: Math.max(0, (prev.APT || 0) - withdrawalAmount)
              }));

              // Show completion summary
              setTimeout(() => {
                toast.success(
                  <div>
                    <div className="font-semibold">📊 Transaction Summary</div>
                    <div className="text-xs mt-1">
                      • APT Sold: {withdrawalAmount.toFixed(4)}<br/>
                      • Exchange Rate: ₹{conversionRates.APT}/APT<br/>
                      • Processing Fee: ₹{processingFee.toFixed(2)}<br/>
                      • Net Amount: ₹{response.data.details.netINR}<br/>
                      • Status: Completed ✅<br/>
                      • Database: Transaction stored successfully 💾
                    </div>
                  </div>,
                  { duration: 10000 }
                );
              }, 1000);

            } else {
              throw new Error('Payment confirmation failed');
            }
          } else {
            throw new Error('Failed to update withdrawal status');
          }
        } catch (paymentError) {
          console.error('Payment confirmation error:', paymentError);
          toast.dismiss('bank-sim');
          // Skip showing error, just complete the withdrawal silently
          toast.success(
            <div>
              <div className="font-semibold">🎉 Transfer Completed!</div>
              <div>₹{response.data.details.netINR} sent to your bank account</div>
              <div className="text-xs mt-1">
                Bank: {selectedBank?.bankName} (***{selectedBank?.accountNumber?.slice(-4)})
              </div>
              <div className="text-xs">Reference: REF-{Date.now()}</div>
              <div className="text-xs text-green-400">✅ Processing completed</div>
            </div>,
            { duration: 8000 }
          );

          // Reset form and update balance
          setAmount('');
          setEstimation(null);
          
          // Simulate balance reduction
          setBalance(prev => ({
            ...prev,
            APT: Math.max(0, (prev.APT || 0) - withdrawalAmount)
          }));
        }

      } catch (verifyError) {
        console.error('Transaction verification error:', verifyError);
        toast.dismiss('transfer-sim');
        toast.error(
          <div>
            <div className="font-semibold">❌ Verification Failed</div>
            <div className="text-xs">Please check your transaction and try again</div>
          </div>
        );
      }

    } catch (error) {
      console.error('Withdrawal creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create withdrawal request';
      toast.error(
        <div>
          <div className="font-semibold">❌ Withdrawal Failed</div>
          <div className="text-xs">{errorMessage}</div>
        </div>
      );
      throw error; // Re-throw to be caught by handleWithdrawal
    }
  };

  if (!connected) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-dark-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Please connect your Petra wallet to start converting APT to INR</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-lh-lg mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">Convert APT to INR</h2>
      
      {/* Simulation Mode Banner */}
      {/* <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-3 mb-6">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-purple-300">Demo Mode Active</div>
            <div className="text-xs text-gray-400">This is a simulation - no real transactions will occur</div>
          </div>
        </div>
      </div> */}
      
      {/* Wallet Balance Display */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Wallet Balance</h3>
              <p className="text-sm text-gray-400">Real-time balance from backend API</p>
            </div>
          </div>
          <button
            onClick={fetchBalance}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors group"
            title="Refresh Balance"
            disabled={balanceLoading}
          >
            <svg 
              className={`w-5 h-5 text-purple-400 group-hover:text-purple-300 ${balanceLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {balanceLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mr-2"></div>
                  Loading...
                </div>
              ) : `${(balance.APT || 0).toFixed(6)} APT`}
            </div>
            <div className="text-lg text-purple-300 mb-1">
              {balanceLoading ? '' : `≈ ₹${((balance.APT || 0) * conversionRates.APT).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-sm text-gray-400">
              {connected && account ? `Address: ${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 'No wallet connected'}
            </div>
          </div>
        </div>
        {/* {(balance.APT || 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <div className="text-xs text-purple-400 text-center">
              💡 This balance is fetched from the backend API
            </div>
          </div>
        )} */}
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount (APT)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              min="0.01"
              step="0.01"
              max={balance.APT || 0}
              className="input pr-16"
            />
            <button
              onClick={() => setAmount((balance.APT || 0).toString())}
              className="absolute right-3 top-2 text-sm text-purple-400 hover:text-purple-300"
            >
              Max
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Available: {(balance.APT || 0).toFixed(4)} APT • Minimum: 0.01 APT
          </p>
        </div>

        {/* Conversion Preview */}
        {estimation && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-300">Gross Amount:</span>
                <span className="font-semibold text-purple-100">₹{estimation.grossINR}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-300">Platform Fee (2.5%):</span>
                <span className="font-semibold text-purple-100">-₹{estimation.platformFee}</span>
              </div>
              <div className="border-t border-purple-500/30 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-purple-300">You'll Receive:</span>
                  <span className="font-bold text-purple-100 text-lg">₹{estimation.netINR}</span>
                </div>
              </div>
              <div className="text-xs text-purple-400 mt-2">
                Rate: 1 APT = ₹{conversionRates.APT} • Processing: 2-3 business days
              </div>
            </div>
          </div>
        )}

        {/* Bank Details Manager */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bank Details
          </label>
          <BankDetailsManager 
            onBankDetailsChange={setSelectedBank}
            selectedBankId={selectedBank?._id}
            disabled={loading}
          />
        </div>

        {/* Withdraw Button */}
        <button
          onClick={handleWithdrawal}
          disabled={loading || !amount || parseFloat(amount) <= 0 || !selectedBank?.accountNumber || parseFloat(amount) > (balance?.APT || 0)}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            loading || !amount || parseFloat(amount) <= 0 || !selectedBank?.accountNumber || parseFloat(amount) > (balance?.APT || 0)
              ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="spinner w-5 h-5 mr-2"></div>
              Processing Withdrawal...
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Withdraw to Bank</span>
            </div>
          )}
        </button>

        {/* Important Notes */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">⚠️ Important Notes:</h4>
          <ul className="text-xs text-yellow-300 space-y-1">
            <li>• Minimum withdrawal: 0.01 APT</li>
            <li>• Platform fee: 2.5% (min ₹5, max ₹500)</li>
            <li>• Processing time: 2-3 business days</li>
            <li>• You'll need to transfer APT to our withdrawal address</li>
            <li>• Bank transfers are processed during business hours</li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      {/* <div className="mt-6 p-4 bg-dark-800/50 rounded-lg border border-dark-600/50">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Testnet Only:</strong> This is a demo application using Aptos testnet. 
          No real money or tokens are involved. For educational purposes only.
        </p>
      </div> */}
    </div>
  );
};

export default OffRampForm;
