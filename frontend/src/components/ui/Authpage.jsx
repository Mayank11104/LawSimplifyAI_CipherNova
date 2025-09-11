import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API service functions
const authAPI = {
  // Login with email/password
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Login failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Register new user
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Registration failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Google OAuth login
  googleLogin: async (credential) => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Google login failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Phone login (if supported by your backend)
  phoneLogin: async (phone, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/phone-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Phone login failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Password reset failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },
};

const AuthPage = ({ isOpen, onClose, onAuthSuccess, theme = 'light' }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    acceptTerms: false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    const errors = [];

    if (activeTab === 'signup') {
      if (!formData.name.trim()) {
        errors.push('Name is required');
      }
      if (!formData.email.trim()) {
        errors.push('Email is required');
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.push('Please enter a valid email address');
      }
      if (formData.password.length < 8) {
        errors.push('Password must be at least 8 characters');
      }
      if (formData.password !== formData.confirmPassword) {
        errors.push('Passwords do not match');
      }
      if (!formData.acceptTerms) {
        errors.push('You must accept the terms and conditions');
      }
    } else {
      const credential = loginMethod === 'email' ? formData.email : formData.phone;
      if (!credential.trim()) {
        errors.push(`${loginMethod === 'email' ? 'Email' : 'Phone'} is required`);
      } else if (loginMethod === 'email' && !/\S+@\S+\.\S+/.test(formData.email)) {
        errors.push('Please enter a valid email address');
      }
      if (!formData.password.trim()) {
        errors.push('Password is required');
      }
    }

    return errors;
  };

  const clearFormData = () => {
    setFormData({
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      name: '',
      acceptTerms: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;

      if (activeTab === 'login') {
        // Handle login
        if (loginMethod === 'email') {
          response = await authAPI.login(formData.email, formData.password);
        } else {
          response = await authAPI.phoneLogin(formData.phone, formData.password);
        }

        setSuccess('Login successful!');

        // Store token if provided
        if (response.id_token) {
          localStorage.setItem('access_token', response.id_token);
        }
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token); // optional
          localStorage.setItem('user', JSON.stringify(response.user)); // optional
        }

        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }

        // Clear sensitive data
        clearFormData();

        // Call success callback
        if (onAuthSuccess) {
          onAuthSuccess(response.user || response);
        }

        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Handle registration
        const userData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          accept_terms: formData.acceptTerms,
        };

        response = await authAPI.register(userData);
        setSuccess('Account created successfully! Please check your email for verification.');

        // Switch to login tab after successful registration
        setTimeout(() => {
          setActiveTab('login');
          setFormData((prev) => ({
            ...prev,
            name: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          }));
        }, 2000);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Success
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Google authentication failed - no credential received');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Decode the JWT to get user info (optional, for debugging)
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Google user info:', decoded);
      console.log('cre', credentialResponse.credential);

      // Send the credential to your backend
      const response = await authAPI.googleLogin(credentialResponse.credential);
      console.log('res', response);
      setSuccess('Google login successful!');

      // Store token if provided

      if (response.id_token) {
        localStorage.setItem('access_token', response.id_token);
      }

      // Clear form data
      clearFormData();

      // Call success callback
      if (onAuthSuccess) {
        onAuthSuccess(response.user || response);
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Error
  const handleGoogleError = () => {
    console.error('Google login error');
    setError('Google authentication failed');
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(formData.email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const switchToSignup = () => {
    setActiveTab('signup');
    setError('');
    setSuccess('');
  };

  const switchToLogin = () => {
    setActiveTab('login');
    setError('');
    setSuccess('');
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-white border border-gray-200'
        } rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-2 right-1 p-2 rounded-full transition-colors z-10 ${
            theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Tab Switcher */}
        <div
          className={`flex border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <button
            onClick={switchToLogin}
            disabled={loading}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'login'
                ? theme === 'dark'
                  ? 'text-white bg-gray-800'
                  : 'text-gray-900 bg-gray-50'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Login
            {activeTab === 'login' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>
          <button
            onClick={switchToSignup}
            disabled={loading}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'signup'
                ? theme === 'dark'
                  ? 'text-white bg-gray-800'
                  : 'text-gray-900 bg-gray-50'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sign Up
            {activeTab === 'signup' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2
              className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
              {activeTab === 'login'
                ? 'Sign in to your account to continue'
                : 'Join us today and get started'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Google OAuth Button */}
          <div className="mb-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              size="large"
              theme={theme === 'dark' ? 'filled_black' : 'outline'}
              text={activeTab === 'login' ? 'signin_with' : 'signup_with'}
              shape="rectangular"
            />
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div
              className={`absolute inset-0 flex items-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}
            >
              <div
                className={`w-full border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
              ></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className={`px-2 ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}
              >
                Or continue with
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login Tab Content */}
            {activeTab === 'login' && (
              <>
                {/* Login Method Toggle */}
                <div
                  className={`flex ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 mb-4`}
                >
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    disabled={loading}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      loginMethod === 'email'
                        ? theme === 'dark'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    disabled={loading}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      loginMethod === 'phone'
                        ? theme === 'dark'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Phone
                  </button>
                </div>

                {/* Email/Phone Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loginMethod === 'email' ? (
                      <Mail
                        className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                      />
                    ) : (
                      <Phone
                        className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                      />
                    )}
                  </div>
                  <input
                    type={loginMethod === 'email' ? 'email' : 'tel'}
                    name={loginMethod}
                    value={formData[loginMethod]}
                    onChange={handleInputChange}
                    placeholder={
                      loginMethod === 'email' ? 'Enter your email' : 'Enter your phone number'
                    }
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
              </>
            )}

            {/* Sign Up Tab Content */}
            {activeTab === 'signup' && (
              <>
                {/* Name Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User
                      className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                    />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>

                {/* Email Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail
                      className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                    />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
              </>
            )}

            {/* Password Input (Common for both tabs) */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock
                  className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                disabled={loading}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff
                    className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                ) : (
                  <Eye
                    className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                )}
              </button>
            </div>

            {/* Confirm Password for Sign Up */}
            {activeTab === 'signup' && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm password"
                  disabled={loading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  required
                />
              </div>
            )}

            {/* Forgot Password Link (Login only) */}
            {activeTab === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className={`text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-800'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms Checkbox for Sign Up */}
            {activeTab === 'signup' && (
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${loading ? 'opacity-50' : ''}`}
                  >
                    I agree to the{' '}
                    <a
                      href="#"
                      className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="#"
                      className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all 
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${
                  loading
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'bg-black text-white hover:bg-gray-900'
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {activeTab === 'login' ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : activeTab === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Switch Auth Mode */}
          <div className="text-center mt-6">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {activeTab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={activeTab === 'login' ? switchToSignup : switchToLogin}
                disabled={loading}
                className={`font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-800'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {activeTab === 'login' ? 'Create account' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
