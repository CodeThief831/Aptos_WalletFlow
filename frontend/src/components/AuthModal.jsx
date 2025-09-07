import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3001';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    confirmPassword: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const validatePhone = (phone) => {
    return /^[0-9]{10}$/.test(phone);
  };

  const validateForm = () => {
    const errors = [];

    if (!isLogin) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
      }

      if (!validatePhone(formData.phone)) {
        errors.push('Please enter a valid 10-digit phone number');
      }

      if (formData.password !== formData.confirmPassword) {
        errors.push('Passwords do not match');
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
    }

    if (!validateEmail(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (formData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      const errors = validateForm();
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        setLoading(false);
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { 
            email: formData.email, 
            password: formData.password, 
            name: formData.name.trim(), 
            phone: formData.phone.trim()
          };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        toast.success(response.data.message);
        onAuthSuccess(response.data.user);
        onClose();
        
        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          phone: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details?.join(', ') || 
                          'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                  {formData.phone && (
                    <div className={`mt-1 text-xs flex items-center space-x-1 ${
                      validatePhone(formData.phone) ? 'text-green-600' : 'text-red-500'
                    }`}>
                      <span>{validatePhone(formData.phone) ? '✓' : '✗'}</span>
                      <span>Valid 10-digit phone number</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={isLogin ? "Enter your password" : "Minimum 6 characters"}
                  minLength={isLogin ? undefined : 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L7.05 7.05M9.878 9.878a3 3 0 105.303 5.303m0 0L19.95 19.95" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {!isLogin && formData.password && (
                <div className="mt-1">
                  <div className="text-xs space-y-1">
                    <div className={`flex items-center space-x-1 ${validatePassword(formData.password).minLength ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{validatePassword(formData.password).minLength ? '✓' : '✗'}</span>
                      <span>At least 6 characters</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${validatePassword(formData.password).hasUpperCase ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{validatePassword(formData.password).hasUpperCase ? '✓' : '✗'}</span>
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${validatePassword(formData.password).hasLowerCase ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{validatePassword(formData.password).hasLowerCase ? '✓' : '✗'}</span>
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${validatePassword(formData.password).hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{validatePassword(formData.password).hasNumber ? '✓' : '✗'}</span>
                      <span>One number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L7.05 7.05M9.878 9.878a3 3 0 105.303 5.303m0 0L19.95 19.95" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className={`mt-1 text-xs flex items-center space-x-1 ${
                    formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'
                  }`}>
                    <span>{formData.password === formData.confirmPassword ? '✓' : '✗'}</span>
                    <span>Passwords match</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isLogin ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={toggleMode}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </div>

          {/* Info Text */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">🔒 Secure & Private:</span> Your details are encrypted and used only for KYC compliance and transaction processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
