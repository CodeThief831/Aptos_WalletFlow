import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAuth } from '../contexts/useAuth';
import OffRampForm from '../components/OffRampForm';
import WalletButton from '../components/WalletButton';
import AuthModal from '../components/AuthModal';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3001';

const OffRamp = () => {
  const { connected, account } = useWallet();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [walletBalance, setWalletBalance] = useState({ APT: 0 });
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch wallet balance from Aptos blockchain
  const fetchWalletBalance = useCallback(async () => {
    if (connected && account?.address) {
      try {
        setBalanceLoading(true);
        
        // Fetch APT balance from Aptos blockchain
        const aptosClient = new (await import('@aptos-labs/ts-sdk')).Aptos(
          new (await import('@aptos-labs/ts-sdk')).AptosConfig({
            network: 'testnet'
          })
        );

        // Get account resources to find APT balance
        const resources = await aptosClient.getAccountResources({
          accountAddress: account.address
        });

        // Find the APT coin store resource
        const aptResource = resources.find(
          (resource) => resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );

        let aptBalance = 0;
        if (aptResource) {
          // APT is stored in octas (1 APT = 100,000,000 octas)
          const octas = parseInt(aptResource.data.coin.value);
          aptBalance = octas / 100000000; // Convert octas to APT
        }

        setWalletBalance({
          APT: aptBalance
        });

        console.log(`📊 OffRamp Page - Balance Updated: ${aptBalance.toFixed(6)} APT`);
        
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
        setWalletBalance({ APT: 0 });
      } finally {
        setBalanceLoading(false);
      }
    } else {
      setWalletBalance({ APT: 0 });
    }
  }, [connected, account?.address]);

  // Fetch withdrawal history
  const fetchWithdrawals = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/offramp/withdrawals?limit=5`, {
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
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/offramp/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWithdrawals();
      fetchStats();
    }
    // Fetch wallet balance when wallet is connected
    if (connected) {
      fetchWalletBalance();
    }
  }, [isAuthenticated, connected, fetchWithdrawals, fetchStats, fetchWalletBalance]);

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
      'withdrawal_requested': 'Pending',
      'transfer_verified': 'Verified',
      'bank_transfer_initiated': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
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

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      {/* <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center animate-pulse-glow">
                  <span className="text-white font-bold">↓</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">Aptos OffRamp</h1>
                  <span className="text-gray-400 text-sm">Crypto-to-Fiat Bridge</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-medium">Convert to INR</span>
              </div>
              <WalletButton />
            </div>
          </div>
        </div>
      </header> */}

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-red-900/20 via-transparent to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                  Convert Crypto to
                  <span className="text-gradient block">Indian Rupees</span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Safely convert your APT and USDC tokens to INR. Get money directly in your bank account 
                  with competitive rates and transparent fees.
                </p>
              </div>
              
              {/* Stats and Wallet Balance */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Wallet Balance */}
                {connected && (
                  <div className="text-center bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-lg font-bold text-purple-300 mb-1">
                      {balanceLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-1"></div>
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : `${walletBalance.APT.toFixed(4)} APT`}
                    </div>
                    <div className="text-gray-400 text-xs">Wallet Balance</div>
                  </div>
                )}
                
                {/* Stats from API */}
                {stats && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gradient">{stats.totalWithdrawals}</div>
                      <div className="text-gray-400 text-sm">Withdrawals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gradient">{stats.successRate.toFixed(0)}%</div>
                      <div className="text-gray-400 text-sm">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gradient">₹{stats.totalWithdrawnINR.toFixed(0)}</div>
                      <div className="text-gray-400 text-sm">Total Withdrawn</div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-dark-800/50 rounded-full border border-dark-700">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300 text-sm">Bank Transfer</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-dark-800/50 rounded-full border border-dark-700">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-gray-300 text-sm">Secure & Fast</span>
                </div>
              </div>
            </div>

            <div className="animate-slide-up">
              <OffRampForm onShowAuth={() => setShowAuthModal(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* Recent Withdrawals */}
      {isAuthenticated && withdrawals.length > 0 && (
        <section className="py-20 bg-dark-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Recent Withdrawals
              </h3>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Track your withdrawal requests and their status
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="card">
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Loading withdrawals...</p>
                    </div>
                  ) : (
                    withdrawals.map((withdrawal) => (
                      <div key={withdrawal._id} className="border border-dark-700 rounded-lg p-4 hover:bg-dark-800/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-semibold text-white">
                                {withdrawal.amount.token} {withdrawal.tokenType}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-lg font-semibold text-green-400">
                                ₹{withdrawal.metadata?.netINR || withdrawal.amount.inr}
                              </span>
                              {getStatusBadge(withdrawal.status)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatDate(withdrawal.createdAt)}
                            </div>
                            {withdrawal.transactionHash && (
                              <div className="text-xs">
                                <a 
                                  href={`https://explorer.aptoslabs.com/txn/${withdrawal.transactionHash}?network=testnet`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:text-purple-300 underline"
                                >
                                  View on Explorer →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              How OffRamp Works
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Convert your crypto to INR in just a few simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Enter Details',
                description: 'Specify amount and provide your bank details',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: 'Transfer Tokens',
                description: 'Send tokens to our withdrawal address',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )
              },
              {
                step: '3',
                title: 'Verification',
                description: 'We verify your transaction on the blockchain',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                step: '4',
                title: 'Bank Transfer',
                description: 'Receive INR in your bank account within 2-3 days',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="card p-6 text-center group hover:bg-dark-800/50 transition-all duration-300">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                        {step.step}
                      </div>
                      <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                    </div>
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-400 group-hover:bg-red-500/30 transition-all duration-300">
                      {step.icon}
                    </div>
                    <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
                
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default OffRamp;
