import React from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import OnRampFormNew from '../components/OnRampFormNew';
import WalletButton from '../components/WalletButton';

const HomePage = () => {
  const { connected } = useWallet();

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Instant Payments',
      description: 'Pay with Razorpay and receive tokens instantly on Aptos testnet'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Secure Transfers',
      description: 'All transactions are secured by Aptos blockchain and verified payments'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      title: 'Low Fees',
      description: 'Minimal gas fees and transparent conversion rates'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Fast Settlement',
      description: 'Transactions complete in seconds with instant confirmation'
    }
  ];

  const supportedTokens = [
    {
      symbol: 'APT',
      name: 'Aptos',
      description: 'Native Aptos blockchain token',
      icon: (
        <div className="w-10 h-10 bg-gradient-to-r from-aptos-500 to-aptos-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
      ),
      gradient: 'from-aptos-500 to-aptos-600'
    },
    // {
    //   symbol: 'USDC',
    //   name: 'USD Coin',
    //   description: 'Stablecoin on Aptos testnet',
    //   icon: (
    //     <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
    //       <span className="text-white font-bold text-sm">$</span>
    //     </div>
    //   ),
    //   gradient: 'from-blue-500 to-blue-600'
    // }
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      {/* <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse-glow">
                  <span className="text-white font-bold">A</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">Aptos OnRamp</h1>
                  <span className="text-gray-400 text-sm">Fiat-to-Crypto Bridge</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Welcome back!</span>
              </div>
            </div>
          </div>
        </div>
      </header> */}

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                  Buy Crypto with
                  <span className="text-gradient block">Indian Rupees</span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  The easiest way to convert your INR to APT and USDC on Aptos blockchain. 
                  Secure, fast, and reliable fiat-to-crypto on-ramp service.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gradient">₹10</div>
                  <div className="text-gray-400 text-sm">Min Purchase</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gradient">~5s</div>
                  <div className="text-gray-400 text-sm">Settlement</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gradient">2</div>
                  <div className="text-gray-400 text-sm">Tokens</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-dark-800/50 rounded-full border border-dark-700">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300 text-sm">Razorpay Secure</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-dark-800/50 rounded-full border border-dark-700">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-gray-300 text-sm">Blockchain Secured</span>
                </div>
              </div>
            </div>

            <div className="animate-slide-up">
              <OnRampFormNew />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Why Choose Aptos OnRamp?
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience the future of fiat-to-crypto conversion with our advanced platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="feature-card group">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="feature-icon p-4 bg-purple-500/20 rounded-xl text-purple-400 group-hover:bg-purple-500/30 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold text-white">{feature.title}</h4>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Services */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Our Services
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Complete crypto-fiat bridge solutions for the Aptos ecosystem
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: 'OnRamp - Buy Crypto',
                description: 'Convert INR to APT and USDC tokens using Razorpay',
                icon: (
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">↑</span>
                  </div>
                ),
                features: ['UPI, Cards, Net Banking', 'Instant token delivery', 'Minimum ₹10', 'Real-time rates'],
                gradient: 'from-green-500 to-green-600',
                available: true
              },
              {
                title: 'OffRamp - Sell Crypto',
                description: 'Convert APT and USDC tokens back to INR',
                icon: (
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">↓</span>
                  </div>
                ),
                features: ['Direct bank transfer', '2-3 day processing', 'Competitive rates', 'Secure withdrawal'],
                gradient: 'from-red-500 to-red-600',
                available: true,
                isNew: true
              }
            ].map((service, index) => (
              <div key={index} className="card card-hover p-8 relative">
                {service.isNew && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">NEW</span>
                  </div>
                )}
                <div className="flex flex-col space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="animate-float">
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-white mb-2">{service.title}</h4>
                      <p className="text-gray-400">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className={`w-full h-1 bg-gradient-to-r ${service.gradient} rounded-full`}></div>
                  
                  {service.available && (
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">Available Now</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Tokens */}
      <section className="py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Supported Tokens
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Trade with confidence using our carefully selected token portfolio
            </p>
          </div>
          
          <div className="grid md:grid-cols-1 gap-8 max-w-4xl mx-auto">
            {supportedTokens.map((token, index) => (
              <div key={index} className="card card-hover p-8">
                <div className="flex items-center space-x-6">
                  <div className="animate-float">
                    {token.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-white mb-1">{token.symbol}</h4>
                    <div className="text-gray-400 text-lg mb-2">{token.name}</div>
                    <p className="text-gray-500">{token.description}</p>
                  </div>
                  <div className={`hidden sm:block w-16 h-1 bg-gradient-to-r ${token.gradient} rounded-full`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              How It Works
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Get started in just four simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Connect Wallet',
                description: 'Connect your Petra wallet to get started',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: 'Enter Amount',
                description: 'Choose INR amount and select your preferred token',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: 'Pay with Razorpay',
                description: 'Complete payment using Razorpay\'s secure checkout',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )
              },
              {
                step: '4',
                title: 'Receive Tokens',
                description: 'Get tokens instantly in your connected wallet',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="card p-6 text-center group hover:bg-dark-800/50 transition-all duration-300">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                        {step.step}
                      </div>
                      <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping"></div>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:bg-purple-500/30 transition-all duration-300">
                      {step.icon}
                    </div>
                    <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
                
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">System Status</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Aptos Testnet', status: true },
                { name: 'Razorpay Integration', status: true },
                { name: 'Smart Contracts', status: true },
                { name: `Wallet Connected`, status: connected }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                  <span className="text-gray-300 font-medium">{item.name}</span>
                  <div className={`flex items-center space-x-2 ${item.status ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-sm font-medium">{item.status ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-dark-900 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <h4 className="text-xl font-bold text-gradient">Aptos OnRamp</h4>
              </div>
              <p className="text-gray-400">Your gateway to the Aptos ecosystem</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Quick Links</h4>
              <div className="space-y-2">
                <a href="https://aptoslabs.com" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-purple-400 transition-colors">
                  Aptos Labs
                </a>
                <a href="https://explorer.aptoslabs.com" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-purple-400 transition-colors">
                  Aptos Explorer
                </a>
                <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-purple-400 transition-colors">
                  Razorpay
                </a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Disclaimer</h4>
              <div className="text-sm text-gray-400 space-y-2">
                <p>This is a testnet demonstration.</p>
                <p>No real money or tokens are involved.</p>
                <p>For educational purposes only.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-dark-800 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 Aptos OnRamp. Built for the future of payments.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
