const express = require('express');
const router = express.Router();

// @route   GET /api/docs
// @desc    API Documentation
// @access  Public
router.get('/', (req, res) => {
  const apiDocs = {
    title: 'Aptos OnRamp API Documentation',
    version: '1.0.0',
    description: 'API for Aptos OnRamp - Fiat to Crypto gateway',
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com/api' 
      : 'http://localhost:3001/api',
    
    endpoints: {
      auth: {
        description: 'Authentication and user management',
        routes: [
          {
            method: 'POST',
            path: '/auth/register',
            description: 'Register a new user',
            access: 'Public',
            body: {
              name: 'string (required)',
              email: 'string (required)',
              password: 'string (required, min 6 chars)',
              phone: 'string (required, 10 digits)',
              walletAddress: 'string (optional)'
            }
          },
          {
            method: 'POST',
            path: '/auth/login',
            description: 'Login user',
            access: 'Public',
            body: {
              email: 'string (required)',
              password: 'string (required)'
            }
          },
          {
            method: 'GET',
            path: '/auth/profile',
            description: 'Get user profile',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'PUT',
            path: '/auth/profile',
            description: 'Update user profile',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              name: 'string (optional)',
              phone: 'string (optional)',
              walletAddress: 'string (optional)'
            }
          },
          {
            method: 'POST',
            path: '/auth/change-password',
            description: 'Change user password',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              currentPassword: 'string (required)',
              newPassword: 'string (required)'
            }
          },
          {
            method: 'GET',
            path: '/auth/user-stats',
            description: 'Get user account statistics',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'POST',
            path: '/auth/logout',
            description: 'Logout user',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          }
        ]
      },
      
      payments: {
        description: 'Payment processing and token transfers',
        routes: [
          {
            method: 'GET',
            path: '/payments/rates',
            description: 'Get current conversion rates',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/payments/health',
            description: 'Check payment service health',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/payments/tokens',
            description: 'Get supported tokens information',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/payments/limits',
            description: 'Get payment limits and fees',
            access: 'Public'
          },
          {
            method: 'POST',
            path: '/payments/create-order',
            description: 'Create Razorpay payment order',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              amount: 'number (required, min 10)',
              tokenType: 'string (required, APT|USDC)',
              walletAddress: 'string (required)'
            }
          },
          {
            method: 'POST',
            path: '/payments/estimate-gas',
            description: 'Estimate gas fees for token transfer',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              amount: 'number (required)',
              tokenType: 'string (required)',
              walletAddress: 'string (required)'
            }
          },
          {
            method: 'POST',
            path: '/payments/verify-payment',
            description: 'Verify Razorpay payment and transfer tokens',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              razorpay_order_id: 'string (required)',
              razorpay_payment_id: 'string (required)',
              razorpay_signature: 'string (required)'
            }
          },
          {
            method: 'GET',
            path: '/payments/transactions',
            description: 'Get user transaction history',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            query: {
              page: 'number (optional, default 1)',
              limit: 'number (optional, default 10)',
              status: 'string (optional)'
            }
          },
          {
            method: 'GET',
            path: '/payments/transaction/:id',
            description: 'Get specific transaction details',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'GET',
            path: '/payments/stats',
            description: 'Get user payment statistics',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'PUT',
            path: '/payments/transaction/:id/cancel',
            description: 'Cancel a pending transaction',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              reason: 'string (optional)'
            }
          },
          {
            method: 'GET',
            path: '/payments/orders/:orderId/status',
            description: 'Get Razorpay order status',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'POST',
            path: '/payments/retry-transfer/:id',
            description: 'Retry failed token transfer',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            }
          },
          {
            method: 'POST',
            path: '/payments/transfer-tokens',
            description: 'Manual token transfer (testing)',
            access: 'Private',
            headers: {
              Authorization: 'Bearer <token>'
            },
            body: {
              walletAddress: 'string (required)',
              amount: 'number (required, min 10)',
              tokenType: 'string (required, APT|USDC)'
            }
          }
        ]
      }
    },
    
    responseFormat: {
      success: {
        success: true,
        data: '... (response data)',
        message: 'Operation completed successfully'
      },
      error: {
        success: false,
        error: 'Error message describing what went wrong'
      }
    },
    
    statusCodes: {
      200: 'OK - Request successful',
      201: 'Created - Resource created successfully',
      400: 'Bad Request - Invalid input or request',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Access denied',
      404: 'Not Found - Resource not found',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server error'
    },
    
    authentication: {
      type: 'Bearer Token',
      description: 'Include JWT token in Authorization header',
      example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      note: 'Obtain token from /auth/login or /auth/register endpoints'
    },
    
    rateLimits: {
      auth: '5 requests per minute',
      payments: '10 requests per minute',
      general: '100 requests per hour'
    },
    
    testing: {
      razorpayTestCards: {
        success: '4111111111111111',
        failure: '4000000000000002',
        note: 'Use these test card numbers in Razorpay test mode'
      },
      testWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      testAmounts: [10, 100, 500, 1000]
    },
    
    supportedTokens: {
      APT: {
        name: 'Aptos Token',
        network: 'testnet',
        minAmount: '₹10',
        maxAmount: '₹100,000'
      },
      USDC: {
        name: 'USD Coin',
        network: 'testnet',
        minAmount: '₹10',
        maxAmount: '₹100,000'
      }
    }
  };

  res.json(apiDocs);
});

// @route   GET /api/docs/postman
// @desc    Get Postman collection for API testing
// @access  Public
router.get('/postman', (req, res) => {
  const postmanCollection = {
    info: {
      name: 'Aptos OnRamp API',
      description: 'Complete API collection for Aptos OnRamp testing',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3001/api',
        type: 'string'
      },
      {
        key: 'token',
        value: 'your-jwt-token-here',
        type: 'string'
      }
    ],
    item: [
      {
        name: 'Authentication',
        item: [
          {
            name: 'Register User',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  name: 'John Doe',
                  email: 'john@example.com',
                  password: 'Password123',
                  phone: '9876543210',
                  walletAddress: '0x1234567890abcdef1234567890abcdef12345678'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/auth/register',
                host: ['{{baseUrl}}'],
                path: ['auth', 'register']
              }
            }
          },
          {
            name: 'Login User',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'john@example.com',
                  password: 'Password123'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/auth/login',
                host: ['{{baseUrl}}'],
                path: ['auth', 'login']
              }
            }
          }
        ]
      },
      {
        name: 'Payments',
        item: [
          {
            name: 'Get Conversion Rates',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/payments/rates',
                host: ['{{baseUrl}}'],
                path: ['payments', 'rates']
              }
            }
          },
          {
            name: 'Create Payment Order',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                },
                {
                  key: 'Authorization',
                  value: 'Bearer {{token}}'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  amount: 100,
                  tokenType: 'APT',
                  walletAddress: '0x1234567890abcdef1234567890abcdef12345678'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/payments/create-order',
                host: ['{{baseUrl}}'],
                path: ['payments', 'create-order']
              }
            }
          }
        ]
      }
    ]
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="aptos-onramp-api.postman_collection.json"');
  res.json(postmanCollection);
});

module.exports = router;
