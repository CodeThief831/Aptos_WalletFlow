import React, { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const Payment = () => {
  const { user } = useAuth();
  const { connected, account } = useWallet();
  const [paymentData, setPaymentData] = useState({
    amount: '',
    recipientAddress: '',
    description: '',
    paymentMethod: 'wallet'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleQuickAmount = (amount) => {
    setPaymentData(prev => ({
      ...prev,
      amount: amount.toString()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/payments/send-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(paymentData.amount),
          recipientAddress: paymentData.recipientAddress,
          description: paymentData.description,
          paymentMethod: paymentData.paymentMethod,
          senderAddress: account?.address
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          transactionHash: data.transactionHash,
          explorerUrl: data.explorerUrl,
          message: 'Payment sent successfully!'
        });
        // Reset form
        setPaymentData({
          amount: '',
          recipientAddress: '',
          description: '',
          paymentMethod: 'wallet'
        });
        toast.success('Payment sent successfully!');
      } else {
        setError(data.message || 'Failed to send payment');
        toast.error(data.message || 'Failed to send payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'wallet',
      name: 'Wallet Transfer',
      description: 'Direct transfer from your connected wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      enabled: connected,
      comingSoon: false
    },
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Pay via UPI, Cards, Net Banking',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      enabled: true,
      comingSoon: true
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Direct bank account transfer',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      enabled: false,
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-dark-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">Send Payment</h1>
          <p className="text-xl text-gray-400">Transfer APT tokens securely to any Aptos address</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              {/* Wallet Status */}
              {user?.walletAddress && (
                <div className="status-connected p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">From Wallet</div>
                      <div className="text-xs font-mono opacity-80">
                        {user.walletAddress.substring(0, 12)}...
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Connected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="notification-error p-4 rounded-lg mb-6 border">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {result && result.success && (
                <div className="notification-success p-4 rounded-lg mb-6 border">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{result.message}</span>
                    </div>
                    {result.explorerUrl && (
                      <a
                        href={result.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline hover:no-underline inline-flex items-center space-x-1"
                      >
                        <span>View on Aptos Explorer</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payment Method Selection */}
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => !method.comingSoon && method.enabled && setPaymentData(prev => ({ ...prev, paymentMethod: method.id }))}
                        disabled={method.comingSoon || !method.enabled}
                        className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                          paymentData.paymentMethod === method.id && method.enabled && !method.comingSoon
                            ? 'border-purple-500 bg-purple-500/20'
                            : method.enabled && !method.comingSoon
                            ? 'border-dark-600 bg-dark-800/50 hover:border-dark-500'
                            : 'border-dark-700 bg-dark-800/30 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              method.enabled && !method.comingSoon ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {method.icon}
                            </div>
                            <div>
                              <div className="font-medium text-white">{method.name}</div>
                              <div className="text-sm text-gray-400">{method.description}</div>
                            </div>
                          </div>
                          {method.comingSoon && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">
                              Coming Soon
                            </span>
                          )}
                          {!method.enabled && !method.comingSoon && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                              Connect Wallet
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Amount Selection */}
                <div className="form-group">
                  <label className="form-label">Quick Amount (APT)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.1, 0.5, 1.0, 2.0].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickAmount(amount)}
                        className={`btn btn-sm ${
                          parseFloat(paymentData.amount) === amount 
                            ? 'btn-primary' 
                            : 'btn-secondary'
                        }`}
                      >
                        {amount} APT
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="form-group">
                  <label className="form-label">Amount (APT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="amount"
                      value={paymentData.amount}
                      onChange={handleInputChange}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      className="input pr-12"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">APT</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum: 0.01 APT</p>
                </div>

                {/* Recipient Address */}
                <div className="form-group">
                  <label className="form-label">Recipient Address</label>
                  <input
                    type="text"
                    name="recipientAddress"
                    value={paymentData.recipientAddress}
                    onChange={handleInputChange}
                    required
                    placeholder="0x..."
                    className="input font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the recipient's Aptos wallet address</p>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    name="description"
                    value={paymentData.description}
                    onChange={handleInputChange}
                    placeholder="What is this payment for?"
                    rows="3"
                    className="input resize-none"
                  />
                </div>

                {/* Send Button */}
                <button 
                  type="submit" 
                  disabled={loading || !paymentData.amount || !paymentData.recipientAddress || !connected}
                  className={`btn w-full py-4 text-lg font-semibold ${
                    loading || !paymentData.amount || !paymentData.recipientAddress || !connected
                      ? 'btn-secondary opacity-50 cursor-not-allowed'
                      : 'btn-primary glow-purple'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 spinner"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send Payment</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Payment Summary & Info */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold text-white">{paymentData.amount || '0.00'} APT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network Fee:</span>
                  <span className="font-semibold text-white">~0.001 APT</span>
                </div>
                <div className="border-t border-dark-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Total:</span>
                    <span className="font-bold text-gradient text-lg">
                      {paymentData.amount ? (parseFloat(paymentData.amount) + 0.001).toFixed(3) : '0.00'} APT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="card p-6">
              <h4 className="text-lg font-bold text-white mb-4">Payment Information</h4>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Payments are processed on the Aptos blockchain</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Transactions typically confirm within 5-10 seconds</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>All transactions are irreversible once confirmed</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Network fees vary based on current blockchain conditions</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="card p-6 border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-yellow-400 mb-2">Security Notice</h4>
                  <p className="text-sm text-gray-300">
                    Always double-check the recipient address before sending. 
                    Transactions on the blockchain cannot be reversed or cancelled once confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
