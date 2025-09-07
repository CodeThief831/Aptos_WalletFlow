import React from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Payment from './pages/Payment';
import HomePage from './pages/HomePage';
import OffRamp from './pages/OffRamp';
import './App.css';

// Configure wallets
const wallets = [new PetraWallet()];

// Loading component with Luma-inspired design
const LoadingScreen = () => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dark-700 border-t-purple-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin opacity-60"></div>
      </div>
      <div className="text-center">
        <div className="text-xl font-semibold text-gradient mb-2">Loading WalletFlow OnRamp</div>
        <div className="text-gray-400 text-sm">Connecting to the future of payments...</div>
      </div>
    </div>
  </div>
);

// Enhanced Navigation with Luma-inspired design
const Navigation = ({ currentPage, onNavigate, onLogout, user }) => (
  <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-md border-b border-dark-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 rounded-lg overflow-hidden">
  <img src="/src/assets/logo.png" alt="WalletFlow Logo" className="w-full h-full object-cover" />
</div>
            <div>
              <h1 className="text-xl font-bold text-gradient"><span>Wallet</span>Flow</h1>
              <p className="text-xs text-gray-500 -mt-1">Fiat-to-Crypto Bridge</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-2">
          <button 
            className={`nav-link ${currentPage === 'home' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </span>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Dashboard</span>
            </span>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'offramp' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('offramp')}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>OffRamp</span>
            </span>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'payment' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('payment')}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send Payment</span>
            </span>
          </button>
        </div>

        {/* User Info and Logout Button */}
        <div className="flex items-center space-x-4">
          {/* User Avatar and Info */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-gray-400">
                {user?.email}
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="btn btn-secondary btn-sm flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden py-3 border-t border-dark-800">
        <div className="flex items-center justify-around">
          <button 
            className={`nav-link ${currentPage === 'home' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </div>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">Dashboard</span>
            </div>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'offramp' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('offramp')}
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-xs">OffRamp</span>
            </div>
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'payment' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('payment')}
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-xs">Payment</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </nav>
);

// Main app component that handles routing
const AppContent = () => {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('home');

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Show login page if not authenticated and not on home page
  if (!isAuthenticated && currentPage !== 'home') {
    return <Login />;
  }

  // Show login page if not authenticated and trying to access restricted content
  if (!isAuthenticated) {
    return <Login />;
  }

  // Simple routing for authenticated users
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'dashboard':
        return <Dashboard />;
      case 'offramp':
        return <OffRamp />;
      case 'payment':
        return <Payment />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        onLogout={() => {
          logout();
          setCurrentPage('home');
        }}
        user={user}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
    </div>
  );
};

// Root app component with providers
function App() {
  return (
    <AptosWalletAdapterProvider 
      wallets={wallets} 
      autoConnect={true}
      onError={(error) => {
        console.error('Wallet adapter error:', error);
      }}
    >
      <AuthProvider>
        <div className="dark">
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                border: '1px solid #334155',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid #059669',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid #dc2626',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#a855f7',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid #9333ea',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </AptosWalletAdapterProvider>
  );
}

export default App;
