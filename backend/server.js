const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import configurations and services
const connectDB = require('./config/database');
const { aptosService } = require('./services/aptosService');

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const offrampRoutes = require('./routes/offramp');
const docsRoutes = require('./routes/docs');
const bankDetailsRoutes = require('./routes/bankDetails');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Initialize Aptos service
aptosService.initialize().catch(error => {
  console.error('Failed to initialize Aptos service:', error);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// General rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    network: process.env.APTOS_NETWORK || 'testnet',
    services: {
      database: 'connected',
      aptos: aptosService.isInitialized ? 'connected' : 'disconnected'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/offramp', offrampRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/bank-details', bankDetailsRoutes);


// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Aptos OnRamp API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    documentation: {
      interactive: `${req.protocol}://${req.get('host')}/api/docs`,
      postman_collection: `${req.protocol}://${req.get('host')}/api/docs/postman`
    },
    endpoints: {
      auth: '/api/auth/*',
      payments: '/api/payments/*',
      health: '/health',
      docs: '/api/docs'
    },
    features: [
      'User authentication and management',
      'Fiat-to-crypto payments via Razorpay',
      'Aptos testnet token transfers',
      'Transaction history and analytics',
      'Real-time gas estimation',
      'Comprehensive API documentation'
    ]
  });
});

// Legacy routes for backwards compatibility
app.use('/auth', authRoutes);
app.use('/api', paymentRoutes);

// Additional legacy endpoints for testing
app.get('/api/rates', (req, res) => {
  res.redirect('/api/payments/rates');
});

app.post('/api/create-order', (req, res) => {
  res.redirect(307, '/api/payments/create-order');
});

app.post('/api/verify-payment', (req, res) => {
  res.redirect(307, '/api/payments/verify');
});

app.post('/api/transfer-tokens', (req, res) => {
  res.redirect(307, '/api/payments/transfer-tokens');
});

// Catch-all route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aptos OnRamp Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Network: ${process.env.APTOS_NETWORK || 'testnet'}`);
  console.log(`💼 Backend accessible at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
