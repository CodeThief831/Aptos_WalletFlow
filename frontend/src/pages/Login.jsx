import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const { login, register, loading, error, clearError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    walletAddress: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoginMode) {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.success('Login successful!');
        // Navigation will be handled by App.jsx automatically
      }
    } else {
      // Registration - validate required fields
      const { email, password, name, phone, walletAddress } = formData;
      if (!email || !password || !name || !phone) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      const userData = { email, password, name, phone };
      if (walletAddress) {
        userData.walletAddress = walletAddress;
      }
      
      const result = await register(userData);
      if (result.success) {
        toast.success('Registration successful!');
        // Navigation will be handled by App.jsx automatically
      }
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      walletAddress: ''
    });
    clearError();
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="card-glass max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gradient mb-2">Aptos OnRamp</h1>
          <p className="text-gray-400">
            {isLoginMode ? 'Welcome back to the future of payments' : 'Join the crypto revolution'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLoginMode && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLoginMode}
                placeholder="Enter your full name"
                className="input"
              />
            </div>
          )}

          {!isLoginMode && (
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required={!isLoginMode}
                pattern="[0-9]{10}"
                title="Please enter a valid 10-digit phone number"
                placeholder="Enter your 10-digit phone number"
                className="input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
              className="input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              minLength="6"
              className="input"
            />
            {!isLoginMode && (
              <p className="text-xs text-gray-500 mt-1">
                Password must contain at least 6 characters with uppercase, lowercase, and a number
              </p>
            )}
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label className="form-label">Wallet Address (Optional)</label>
              <input
                type="text"
                id="walletAddress"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleInputChange}
                placeholder="Enter your Aptos wallet address"
                className="input"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3 text-lg font-semibold"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 spinner"></div>
                <span>Please wait...</span>
              </div>
            ) : (
              isLoginMode ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              className="text-purple-400 hover:text-purple-300 underline font-medium"
              onClick={toggleMode}
            >
              {isLoginMode ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Features Section for Registration */}
        {!isLoginMode && (
          <div className="mt-8 pt-6 border-t border-dark-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Why choose Aptos OnRamp?</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>Instant fiat-to-crypto conversion</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>Secure transactions with Razorpay</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>Direct transfer to your Aptos wallet</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
