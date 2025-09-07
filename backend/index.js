const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const { AptosConfig, Aptos, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = require('./config/database');
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret for authentication
const JWT_SECRET = process.env.JWT_SECRET || 'aptos-onramp-secret-2024';

// In-memory user storage (in production, use a proper database)
const users = new Map();

// In-memory session storage for user transactions
const userSessions = new Map();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const paymentsRoutes = require('./routes/payments');
const docsRoutes = require('./routes/docs');
const bankDetailsRoutes = require('./routes/bankDetails');

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/bank-details', bankDetailsRoutes);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initialize Aptos client
const aptosConfig = new AptosConfig({ 
  network: process.env.APTOS_NETWORK === 'mainnet' ? Network.MAINNET : Network.TESTNET 
});
const aptos = new Aptos(aptosConfig);

// Initialize backend Aptos account
let backendAccount;
try {
  if (process.env.APTOS_PRIVATE_KEY) {
    const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY);
    backendAccount = Account.fromPrivateKey({ privateKey });
    console.log('✅ Backend Aptos account initialized:', backendAccount.accountAddress.toString());
  } else {
    console.warn('⚠️ APTOS_PRIVATE_KEY not set. Generate one using the deployment script.');
    backendAccount = null;
  }
} catch (error) {
  console.error('❌ Failed to initialize Aptos account:', error.message);
  backendAccount = null;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 90000; //15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const userData = rateLimitStore.get(ip);
  if (now > userData.resetTime) {
    userData.count = 1;
    userData.resetTime = now + windowMs;
    return next();
  }

  if (userData.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  userData.count++;
  next();
};

// Apply rate limiting to all routes
app.use(rateLimit);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, walletAddress } = req.body;

    if (!email || !password || !name || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      phone,
      walletAddress: walletAddress || null,
      createdAt: new Date().toISOString(),
      kycCompleted: false
    };

    users.set(email, user);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        walletAddress: user.walletAddress,
        kycCompleted: user.kycCompleted
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        walletAddress: user.walletAddress,
        kycCompleted: user.kycCompleted
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Update user profile (including wallet address)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, walletAddress } = req.body;
    const userEmail = req.user.email;
    
    const user = users.get(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (walletAddress) user.walletAddress = walletAddress;
    user.updatedAt = new Date().toISOString();

    users.set(userEmail, user);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        walletAddress: user.walletAddress,
        kycCompleted: user.kycCompleted
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    network: process.env.APTOS_NETWORK || 'testnet'
  });
});

// Create Razorpay order (requires authentication)
app.post('/api/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', token, walletAddress } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!token || !['APT', 'USDC'].includes(token)) {
      return res.status(400).json({ error: 'Invalid token selection' });
    }

    // Get user details
    const user = users.get(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user wallet address if provided
    if (walletAddress !== user.walletAddress) {
      user.walletAddress = walletAddress;
      users.set(userEmail, user);
    }

    // Convert to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `onramp_${Date.now().toString().slice(-8)}`,
      payment_capture: 1,
      notes: {
        userId: userId,
        userEmail: userEmail,
        userName: user.name,
        userPhone: user.phone,
        token: token,
        walletAddress: walletAddress
      }
    };

    const order = await razorpay.orders.create(options);
    
    // Store order details in user session
    userSessions.set(order.id, {
      userId,
      userEmail,
      amount,
      token,
      walletAddress,
      orderCreatedAt: new Date().toISOString(),
      status: 'created'
    });
    
    console.log('📝 Order created for user:', user.name, '| Order ID:', order.id, '| Amount:', amount, 'INR | Token:', token);

    res.json({
      success: true,
      order_id: order.id,
      amount: amount,
      currency: currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('❌ Order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify Razorpay payment (requires authentication)
app.post('/api/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    } = req.body;

    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get session data
    const sessionData = userSessions.get(razorpay_order_id);
    if (!sessionData) {
      return res.status(400).json({ error: 'Invalid order session' });
    }

    // Verify user owns this order
    if (sessionData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to order' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    console.log('✅ Payment verified for user:', userEmail, '| Payment ID:', razorpay_payment_id);

    // Update session status
    sessionData.status = 'payment_verified';
    sessionData.paymentId = razorpay_payment_id;
    sessionData.verifiedAt = new Date().toISOString();
    userSessions.set(razorpay_order_id, sessionData);

    // Start token transfer process
    try {
      console.log('🚀 Starting token transfer for:', sessionData.walletAddress, '| Token:', sessionData.token, '| Amount:', sessionData.amount, 'INR');
      
      const transferResult = await transferTokens(
        sessionData.walletAddress, 
        sessionData.token, 
        sessionData.amount
      );
      
      // Update session with successful transfer
      sessionData.status = 'completed';
      sessionData.transactionHash = transferResult.hash;
      sessionData.completedAt = new Date().toISOString();
      userSessions.set(razorpay_order_id, sessionData);
      
      console.log('🎉 Transaction completed successfully! Hash:', transferResult.hash);
      
      res.json({
        success: true,
        payment_id: razorpay_payment_id,
        transaction_hash: transferResult.hash,
        explorer_url: `https://explorer.aptoslabs.com/txn/${transferResult.hash}?network=testnet`,
        message: 'Payment verified and tokens transferred successfully',
        user: {
          name: users.get(userEmail).name,
          walletAddress: sessionData.walletAddress,
          tokenReceived: sessionData.token,
          amountPaid: sessionData.amount
        }
      });
    } catch (transferError) {
      console.error('❌ Token transfer failed for user:', userEmail, '| Error:', transferError.message);
      
      // Update session with failed transfer
      sessionData.status = 'transfer_failed';
      sessionData.error = transferError.message;
      sessionData.failedAt = new Date().toISOString();
      userSessions.set(razorpay_order_id, sessionData);
      res.status(500).json({ 
        error: 'Payment verified but token transfer failed',
        payment_id: razorpay_payment_id 
      });
    }
  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Transfer tokens to user
async function transferTokens(userAddress, tokenType, inrAmount) {
  try {
    console.log(`🔄 Processing token transfer: ${inrAmount} INR → ${tokenType} to ${userAddress}`);

    if (!backendAccount) {
      throw new Error('Backend Aptos account not initialized');
    }

    // Validate inputs
    if (!userAddress || !tokenType || !inrAmount) {
      throw new Error('Missing required parameters for token transfer');
    }

    if (!['APT', 'USDC'].includes(tokenType)) {
      throw new Error('Invalid token type. Supported: APT, USDC');
    }

    if (inrAmount <= 0) {
      throw new Error('Invalid amount. Must be greater than 0');
    }

    // Check if backend account has sufficient balance
    try {
      const accountResources = await aptos.getAccountResource({
        accountAddress: backendAccount.accountAddress,
        resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      });
      
      const balance = parseInt(accountResources.coin.value);
      console.log(`💰 Backend wallet balance: ${balance / 1e8} APT`);
      
      if (balance < 1e6) { // Less than 0.01 APT
        throw new Error('Insufficient backend wallet balance. Please fund the backend wallet at: https://faucet.aptoslabs.com');
      }
    } catch (balanceError) {
      console.warn('⚠️ Could not check balance:', balanceError.message);
    }

    // Simple conversion rates (in production, fetch from exchange APIs)
    const conversionRates = {
      'APT': 0.1,    // 1 INR = 0.1 APT (example rate)
      'USDC': 0.012  // 1 INR = 0.012 USDC (example rate)
    };

    const tokenAmountDecimal = inrAmount * conversionRates[tokenType];
    const tokenAmount = Math.floor(tokenAmountDecimal * 1e8); // Convert to atomic units

    console.log(`💱 Conversion: ${inrAmount} INR → ${tokenAmountDecimal} ${tokenType} (${tokenAmount} atomic units)`);

    let transaction;

    if (tokenType === 'APT') {
      // Transfer APT directly
      console.log('🪙 Transferring APT tokens...');
      transaction = await aptos.transaction.build.simple({
        sender: backendAccount.accountAddress,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [userAddress, tokenAmount],
        },
      });
    } else if (tokenType === 'USDC') {
      // For USDC, we'll do a direct APT transfer as a demo
      // In production, you would mint actual USDC tokens
      console.log('🪙 Transferring equivalent APT for USDC (demo mode)...');
      transaction = await aptos.transaction.build.simple({
        sender: backendAccount.accountAddress,
        data: {
          function: "0x1::coin::transfer",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [userAddress, tokenAmount],
        },
      });
    } else {
      throw new Error('Unsupported token type');
    }

    console.log('🔄 Submitting transaction to Aptos network...');
    const pendingTransaction = await aptos.signAndSubmitTransaction({
      signer: backendAccount,
      transaction,
    });

    console.log('⏳ Waiting for transaction confirmation...');
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });

    console.log(`💰 Successfully transferred ${tokenAmountDecimal} ${tokenType} to ${userAddress}`);
    console.log(`🔗 Transaction: https://explorer.aptoslabs.com/txn/${executedTransaction.hash}?network=${process.env.APTOS_NETWORK || 'testnet'}`);

    return executedTransaction;
  } catch (error) {
    console.error('❌ Token transfer error:', error.message);
    throw new Error(`Token transfer failed: ${error.message}`);
  }
}

// Manual token transfer endpoint (for testing)
app.post('/api/transfer-tokens', async (req, res) => {
  try {
    const { user_address, token_type, inr_amount } = req.body;

    if (!user_address || !token_type || !inr_amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await transferTokens(user_address, token_type, inr_amount);

    res.json({
      success: true,
      transaction_hash: result.hash,
      explorer_url: `https://explorer.aptoslabs.com/txn/${result.hash}?network=${process.env.APTOS_NETWORK || 'testnet'}`
    });
  } catch (error) {
    console.error('❌ Token transfer failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get token balance
app.get('/api/balance/:address/:token', async (req, res) => {
  try {
    const { address, token } = req.params;
    console.log(req);

    let balance;
    if (token === 'APT') {
      const resource = await aptos.getAccountResource({
        accountAddress: address,
        resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
      });
      balance = resource.coin.value / 1e8; // Convert from atomic units
    } else if (token === 'USDC') {
      const contractAddress = process.env.APTOS_CONTRACT_ADDRESS || backendAccount.accountAddress.toString();
      try {
        const resource = await aptos.getAccountResource({
          accountAddress: address,
          resourceType: `0x1::coin::CoinStore<${contractAddress}::OnRamp::TestUSDC>`,
        });
        balance = resource.coin.value / 1e6; // USDC has 6 decimals
      } catch {
        balance = 0; // Account not registered or no balance
      }
    } else {
      return res.status(400).json({ error: 'Unsupported token type' });
    }

    res.json({ balance });
  } catch (error) {
    console.error('❌ Balance fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get conversion rates
app.get('/api/rates', (req, res) => {
  // In production, fetch from exchange APIs
  const rates = {
    'APT': {
      inr_per_token: 10, // 1 APT = 10 INR
      token_per_inr: 0.1 // 1 INR = 0.1 APT
    },
    'USDC': {
      inr_per_token: 83, // 1 USDC = 83 INR
      token_per_inr: 0.012 // 1 INR = 0.012 USDC
    }
  };

  res.json({ rates });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Aptos OnRamp Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Network: ${process.env.APTOS_NETWORK || 'testnet'}`);
  if (backendAccount) {
    console.log(`💼 Backend wallet: ${backendAccount.accountAddress.toString()}`);
  }
});