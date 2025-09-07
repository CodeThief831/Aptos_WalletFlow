import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import WithdrawalHistory from '../components/WithdrawalHistory';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    successfulTransactions: 0,
    totalSpent: 0,
    successRate: 0,
    tokensByType: []
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error('Please login again');
          logout();
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch transactions and stats in parallel
        const [transactionsResponse, statsResponse] = await Promise.all([
          axios.get('http://localhost:3001/api/payments/transactions', { headers }),
          axios.get('http://localhost:3001/api/payments/stats', { headers })
        ]);

        if (transactionsResponse.data.success) {
          const transactions = transactionsResponse.data.transactions || [];
          console.log('Transactions received:', transactions.length > 0 ? transactions[0] : 'No transactions');
          setTransactions(transactions);
        }

        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats || {
            totalTransactions: 0,
            successfulTransactions: 0,
            totalSpent: 0,
            successRate: 0,
            tokensByType: []
          });
        }

        // Fetch wallet balance if user has a wallet address
        if (user?.walletAddress) {
          await fetchWalletBalance(user.walletAddress, headers);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          logout();
        } else {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, logout]);

  const fetchWalletBalance = async (address, headers) => {
    try {
      setBalanceLoading(true);
      const response = await axios.get(`http://localhost:3001/api/payments/wallet-balance/${address}`, { headers });
      
      if (response.data.success) {
        setWalletBalance(response.data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      // Don't show error toast for balance fetch failures
    } finally {
      setBalanceLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (user?.walletAddress) {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      await fetchWalletBalance(user.walletAddress, headers);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'payment_verified': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'payment_verified': return 'Processing';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const formatTransactionHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 6)}`;
  };

  const handleTransactionView = (transaction) => {
    if (transaction.metadata?.simulated) {
      const message = `🎭 Demo Transaction Details:
      
Hash: ${transaction.transactionHash}
Type: ${transaction.metadata?.transferType || 'transfer'}
Status: Simulated (for demo purposes)

In production:
• This would be a real transaction on Aptos blockchain
• You could view it on the Aptos Explorer
• Tokens would actually be transferred between wallets

Current demo shows the complete flow without spending real tokens.`;
      
      toast.info(message, { 
        duration: 6000,
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #374151',
          maxWidth: '500px'
        }
      });
    } else if (transaction.metadata?.explorerUrl) {
      window.open(transaction.metadata.explorerUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-dark-700 border-t-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin opacity-60"></div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gradient mb-2">Loading Dashboard</div>
            <div className="text-gray-400 text-sm">Fetching your data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="bg-dark-900/50 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Here's your account overview.</h1>
              {/* <p className="text-gray-400"></p> */}
              {user?.walletAddress && (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-sm">Wallet:</span>
                    <button 
                      onClick={() => copyToClipboard(user.walletAddress)}
                      className="text-purple-400 hover:text-purple-300 font-mono text-sm bg-dark-800 px-2 py-1 rounded transition-colors"
                      title="Click to copy"
                    >
                      {user.walletAddress.substring(0, 8)}...{user.walletAddress.substring(-6)}
                    </button>
                  </div>
                  {walletBalance && (
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 text-sm">Balance:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400 font-semibold">
                          {walletBalance.balance.formatted}
                        </span>
                        <span className="text-gray-400 text-sm">
                          (≈ ₹{walletBalance.balance.inr_equivalent})
                        </span>
                        <button 
                          onClick={refreshBalance}
                          disabled={balanceLoading}
                          className="text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                          title="Refresh balance"
                        >
                          <svg className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {!walletBalance && user.walletAddress && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 text-sm">Balance:</span>
                      <button 
                        onClick={refreshBalance}
                        disabled={balanceLoading}
                        className="text-purple-400 hover:text-purple-300 text-sm transition-colors disabled:opacity-50"
                      >
                        {balanceLoading ? 'Loading...' : 'Check Balance'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* <button 
              onClick={handleLogout} 
              className="btn btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button> */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Testnet Information Banner */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-green-400 font-semibold">Aptos Testnet Active</h3>
              <p className="text-green-300 text-sm">
                All transactions are processed on the Aptos testnet using real APT tokens. 
                Tokens are funded automatically via faucet for demonstration purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-dark-800/50 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )},
            { id: 'transactions', label: 'OnRamp History', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )},
            { id: 'withdrawals', label: 'OffRamp History', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            )},
            { id: 'profile', label: 'Profile', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Wallet Balance Card */}
            {user?.walletAddress && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Wallet Balance</h2>
                  <button 
                    onClick={refreshBalance}
                    disabled={balanceLoading}
                    className="btn btn-secondary text-sm py-2 px-3 disabled:opacity-50"
                  >
                    {balanceLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {walletBalance ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-emerald-400">APT</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-lg">
                            {walletBalance.balance.apt.toFixed(6)} APT
                          </div>
                          <div className="text-sm text-gray-400">
                            ≈ ₹{walletBalance.balance.inr_equivalent.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          Last updated: {new Date(walletBalance.balance.last_updated).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Wallet Balance</h3>
                    <p className="text-gray-400 mb-4">Check your APT balance</p>
                    <button 
                      onClick={refreshBalance}
                      disabled={balanceLoading}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {balanceLoading ? 'Loading...' : 'Check Balance'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-value">{stats.totalTransactions}</div>
                    <div className="stat-label">Total Transactions</div>
                  </div>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-value">{stats.successfulTransactions}</div>
                    <div className="stat-label">Successful</div>
                  </div>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-value">₹{stats.totalSpent || 0}</div>
                    <div className="stat-label">Total Spent</div>
                  </div>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-value">{Math.round(stats.successRate || 0)}%</div>
                    <div className="stat-label">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Distribution */}
            {stats.tokensByType && stats.tokensByType.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-bold text-white mb-6">Token Distribution</h2>
                <div className="space-y-4">
                  {stats.tokensByType.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          token._id === 'APT' ? 'bg-aptos-500/20' : 'bg-blue-500/20'
                        }`}>
                          <span className={`font-bold text-sm ${
                            token._id === 'APT' ? 'text-aptos-400' : 'text-blue-400'
                          }`}>
                            {token._id === 'APT' ? 'A' : '$'}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">{token._id}</div>
                          <div className="text-sm text-gray-400">{(token.total || 0).toFixed(4)} tokens</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {token.count || 0} transaction{(token.count || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                {transactions.some(t => t.metadata?.simulated) && (
                  <div className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">
                    📝 Some transactions are simulated for demo
                  </div>
                )}
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.filter(transaction => transaction && transaction._id).slice(0, 5).map((transaction) => (
                    <div key={transaction._id} className="transaction-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center space-x-2">
                              <span>ID: {transaction._id.slice(-8)}</span>
                              {transaction.transactionHash && (
                                <button
                                  onClick={() => copyToClipboard(transaction.transactionHash)}
                                  className="text-purple-400 hover:text-purple-300 text-xs underline"
                                  title="Copy transaction hash"
                                >
                                  {formatTransactionHash(transaction.transactionHash)}
                                </button>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center space-x-2">
                              <span>{formatDate(transaction.createdAt)}</span>
                              {transaction.metadata?.simulated && (
                                <span className="text-orange-400 text-xs px-1 py-0.5 bg-orange-500/10 rounded">
                                  Demo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {transaction?.amount?.inr > 0 ? 
                              `₹${transaction.amount.inr}` : 
                              transaction?.amount?.token ? 
                                `${transaction.amount.token} ${transaction.tokenType || 'APT'}` :
                                'Direct Transfer'
                            }
                          </div>
                          <div className="text-sm text-gray-400">
                            {transaction?.amount?.token ? 
                              `${transaction.amount.token} ${transaction.tokenType || 'APT'}` :
                              'APT Transfer'
                            }
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                          {getStatusLabel(transaction.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No transactions yet</h3>
                  <p className="text-gray-400 mb-4">Start by making your first transaction!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => window.location.href = '/'}
                  >
                    Make First Transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-6">All Transactions</h2>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.filter(transaction => transaction && transaction._id).map((transaction) => (
                  <div key={transaction._id} className="transaction-card">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="font-mono text-sm text-purple-400">
                        {transaction._id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </div>
                      <div className="font-semibold text-white">
                        {transaction?.amount?.inr > 0 ? 
                          `₹${transaction.amount.inr}` : 
                          transaction?.amount?.token ? 
                            `${transaction.amount.token} ${transaction.tokenType || 'APT'}` :
                            'Direct Transfer'
                        }
                      </div>
                      <div className="text-sm text-gray-300">
                        {transaction?.amount?.token ? 
                          `${transaction.amount.token} ${transaction.tokenType || 'APT'}` :
                          'APT Transfer'
                        }
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border w-fit ${getStatusColor(transaction.status)}`}>
                        {getStatusLabel(transaction.status)}
                      </div>
                      <div>
                        {transaction.metadata?.explorerUrl && (
                          transaction.metadata?.simulated ? (
                            <button
                              onClick={() => handleTransactionView(transaction)}
                              className="text-orange-400 hover:text-orange-300 text-sm cursor-pointer underline"
                              title="This is a simulated transaction for demo purposes"
                            >
                              Demo Tx
                            </button>
                          ) : (
                            <a 
                              href={transaction.metadata.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 text-sm underline"
                            >
                              View
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No transactions found</h3>
                <p className="text-gray-400">Your transaction history will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <WithdrawalHistory />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
            <div className="space-y-6">
              {[
                { label: 'Name', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Phone', value: user?.phone },
                { 
                  label: 'Wallet Address', 
                  value: user?.walletAddress,
                  copyable: true
                },
                { 
                  label: 'KYC Status', 
                  value: user?.kycStatus || 'pending',
                  badge: true
                },
                { label: 'Member Since', value: formatDate(user?.createdAt) }
              ].map((field, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-dark-700 last:border-b-0">
                  <span className="text-gray-400 font-medium">{field.label}:</span>
                  <div className="flex items-center space-x-2">
                    {field.badge ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        field.value === 'verified' ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' :
                        field.value === 'pending' ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' :
                        'text-red-400 bg-red-500/20 border-red-500/30'
                      }`}>
                        {field.value}
                      </span>
                    ) : field.copyable && field.value ? (
                      <button 
                        onClick={() => copyToClipboard(field.value)}
                        className="text-purple-400 hover:text-purple-300 font-mono text-sm bg-dark-800 px-2 py-1 rounded transition-colors"
                        title="Click to copy"
                      >
                        {field.value}
                      </button>
                    ) : (
                      <span className="text-white">{field.value || 'Not set'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
