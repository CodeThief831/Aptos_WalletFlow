# 🚀 Aptos OnRamp - Complete Fiat-to-Crypto Application

A comprehensive **Fiat-to-Crypto On-Ramp Application** built exactly as specified in the requirements. Convert Indian Rupees (INR) to APT and USDC tokens instantly on Aptos testnet using Razorpay payments.

![Aptos OnRamp Demo](https://via.placeholder.com/800x400/8B5CF6/FFFFFF?text=Aptos+OnRamp+Demo)

## ✨ Features Implemented

### 🎯 Core Requirements (Fully Implemented)

#### **Frontend (React + Tailwind)**
- ✅ **Form with exact specifications**:
  - INR amount input (minimum ₹10)
  - Token dropdown (APT or USDC on Aptos testnet)
  - "Pay with Razorpay" button
- ✅ **Transaction result display**:
  - Amount paid, Aptos address, Aptos Explorer link
  - Success modal: "You received tokens in your wallet"
- ✅ **Modern responsive design** with TailwindCSS

#### **Backend (Express + Razorpay + Aptos SDK)**
- ✅ **API Routes**:
  - `POST /api/payments/create-order` → Razorpay order generation
  - `POST /api/payments/verify-payment` → Payment verification + token transfer
  - `POST /api/payments/transfer-tokens` → Direct token transfer
  - `GET /api/payments/rates` → Real-time conversion rates
- ✅ **Environment variables**: Razorpay API keys + Aptos private key
- ✅ **Error handling**: Payment failures, wallet issues, transfer failures
- ✅ **Transaction logging**: Complete audit trail

#### **Move Smart Contracts (Aptos)**
- ✅ **OnRamp.move module** with:
  - `mint_usdc(recipient, amount)` → Mint test USDC
  - `transfer_usdc(sender, recipient, amount)` → Transfer USDC
  - `transfer_apt(sender, recipient, amount)` → Transfer APT
- ✅ **Deployment scripts**: Both shell and TypeScript versions
- ✅ **Contract integration**: Backend calls contracts for USDC operations

#### **Integration Flow (Complete)**
- ✅ Frontend → `create-order` → Razorpay order
- ✅ Razorpay payment widget → User payment
- ✅ Payment verification → Backend validates signature
- ✅ Successful payment → Aptos SDK token transfer
- ✅ Frontend updates → Transaction hash + success message

### 🎁 Bonus Features (Implemented)

- ✅ **Gas fee estimation**: Shows estimated Aptos gas fees
- ✅ **Enhanced UI/UX**: Modern glassmorphism design
- ✅ **User authentication**: Complete login/register system
- ✅ **Transaction dashboard**: History and statistics
- ✅ **Wallet integration**: Petra wallet with auto-connect
- ✅ **Real-time rates**: Dynamic conversion rate display
- ✅ **Mobile responsive**: Works on all devices
- ✅ **Error boundaries**: Comprehensive error handling

## 🛠 Tech Stack

### Frontend
- **Framework**: Vite + React 18 (JavaScript)
- **Styling**: TailwindCSS
- **Wallet**: Aptos Wallet Adapter + Petra Plugin
- **HTTP**: Axios
- **Notifications**: React Hot Toast
- **State**: React Context + Custom Hooks

### Backend
- **Runtime**: Node.js + Express
- **Payment**: Razorpay API
- **Blockchain**: Aptos SDK for TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: express-validator

### Blockchain
- **Network**: Aptos Testnet
- **Smart Contracts**: Move language
- **Tokens**: APT (native) + Test USDC (custom)
- **Tools**: Aptos CLI + SDK

## 📁 Project Structure

```
aptos-onramp/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── OnRampFormNew.jsx    # Main on-ramp form
│   │   │   ├── AuthModal.jsx        # Authentication modal
│   │   │   └── WalletButton.jsx     # Wallet connection
│   │   ├── pages/           # Page components
│   │   │   ├── HomePage.jsx         # Landing page
│   │   │   ├── Dashboard.jsx        # User dashboard
│   │   │   └── Payment.jsx          # Payment page
│   │   ├── contexts/        # React contexts
│   │   │   └── AuthContext.jsx      # Authentication state
│   │   └── App.jsx          # Main app component
│   ├── public/              # Static assets
│   └── package.json         # Dependencies
├── backend/                 # Express backend
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── payments.js      # Payment & transfer routes
│   ├── models/              # Database models
│   │   ├── User.js          # User model
│   │   └── Transaction.js   # Transaction model
│   ├── services/
│   │   └── aptosService.js  # Aptos blockchain service
│   ├── middleware/          # Express middleware
│   └── index.js             # Main server file
├── contracts/               # Move smart contracts
│   ├── OnRamp.move          # Main contract
│   ├── Move.toml            # Package configuration
│   ├── publish.sh           # Deployment script
│   └── publish.ts           # TypeScript deployment
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- Git

### 1. Clone & Setup
```bash
git clone <repository-url>
cd aptos-onramp

# Run complete setup
chmod +x demo-complete.sh
./demo-complete.sh setup
```

### 2. Configure Environment

#### Backend Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your keys:
# - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
# - APTOS_PRIVATE_KEY & APTOS_CONTRACT_ADDRESS
# - MONGODB_URI
# - JWT_SECRET
```

#### Frontend Configuration
```bash
cd frontend
cp .env.example .env
# Edit .env with:
# - VITE_API_BASE_URL=http://localhost:3001/api
# - VITE_RAZORPAY_KEY_ID (public key)
```

### 3. Deploy Smart Contract
```bash
cd contracts
./publish.sh
# Or use TypeScript version:
# npx ts-node publish.ts
```

### 4. Start Development
```bash
# Start both servers
./demo-complete.sh start

# Or manually:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### 5. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📋 Usage Guide

### For Users

1. **Connect Wallet**
   - Click "Connect Petra Wallet"
   - Install Petra extension if needed
   - Switch to Aptos testnet

2. **Register/Login**
   - Click "Login / Sign Up"
   - Create account with email & password
   - Verify phone number (format validation)

3. **Buy Crypto**
   - Enter INR amount (min ₹10)
   - Select token (APT or USDC)
   - Review conversion rate & gas estimate
   - Click "Pay with Razorpay"

4. **Complete Payment**
   - Razorpay modal opens
   - Use test payment methods
   - Complete payment

5. **Receive Tokens**
   - Success modal shows transaction details
   - Tokens appear in connected wallet
   - View transaction on Aptos Explorer

### For Developers

#### API Endpoints

```bash
# Get conversion rates
GET /api/payments/rates

# Create payment order
POST /api/payments/create-order
{
  "amount": 1000,
  "tokenType": "APT",
  "walletAddress": "0x..."
}

# Verify payment
POST /api/payments/verify-payment
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "..."
}

# Manual token transfer
POST /api/payments/transfer-tokens
{
  "walletAddress": "0x...",
  "amount": 1000,
  "tokenType": "USDC"
}

# Get transaction history
GET /api/payments/transactions

# Get user statistics
GET /api/payments/stats
```

#### Smart Contract Functions

```move
// Initialize contract
public entry fun initialize(admin: &signer)

// Mint USDC tokens
public entry fun mint_usdc(
    admin: &signer,
    recipient: address,
    amount: u64,
    transaction_id: String
)

// Transfer USDC
public entry fun transfer_usdc(
    sender: &signer,
    recipient: address,
    amount: u64,
    transaction_id: String
)

// Transfer APT
public entry fun transfer_apt(
    sender: &signer,
    recipient: address,
    amount: u64,
    transaction_id: String
)
```

## 🔧 Configuration

### Razorpay Setup
1. Create account at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Enable test mode
3. Get API Key ID and Secret
4. Add webhook URL: `http://localhost:3001/api/payments/verify-payment`
5. Configure test payment methods

### Aptos Setup
1. Install [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli)
2. Generate account: `aptos init`
3. Fund testnet account: [Aptos Faucet](https://aptoslabs.com/testnet-faucet)
4. Deploy contract: `cd contracts && ./publish.sh`
5. Update backend .env with private key and contract address

### Database Setup
```bash
# Local MongoDB
sudo systemctl start mongod

# Or use MongoDB Atlas
# Update MONGODB_URI in backend/.env
```

## 🧪 Testing

### Test Payment Cards (Razorpay)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### Test Scenarios
1. **Happy Path**: Complete end-to-end transaction
2. **Payment Failure**: Use failure test card
3. **Wallet Disconnect**: Test wallet connection issues
4. **Network Errors**: Test API failure scenarios
5. **Gas Estimation**: Test with different amounts

### Automated Testing
```bash
# Backend API tests
cd backend
npm test

# Frontend component tests
cd frontend
npm test

# Contract tests
cd contracts
npm test
```

## 🔒 Security Features

- **Payment Verification**: Razorpay signature validation
- **Authentication**: JWT with secure sessions
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive data sanitization
- **CORS Protection**: Restricts cross-origin requests
- **Password Security**: bcrypt hashing with salt rounds
- **Environment Security**: Sensitive data in environment variables

## 🌟 Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://...  # Production database
RAZORPAY_KEY_ID=rzp_live_...   # Live Razorpay keys
APTOS_NETWORK=mainnet          # Mainnet deployment
```

### Security Checklist
- [ ] Strong JWT secret (32+ characters)
- [ ] Production MongoDB URI
- [ ] Live Razorpay keys with webhooks
- [ ] Mainnet Aptos configuration
- [ ] SSL/TLS certificates
- [ ] Environment-specific secrets
- [ ] Rate limiting configuration
- [ ] CORS origins restriction

### Deployment Steps
1. **Backend**: Deploy to Heroku/AWS/DigitalOcean
2. **Frontend**: Deploy to Vercel/Netlify
3. **Database**: MongoDB Atlas production cluster
4. **Smart Contracts**: Deploy to Aptos mainnet
5. **Domain**: Configure custom domain with SSL

## 📊 Monitoring & Analytics

### Metrics to Track
- Transaction success/failure rates
- Payment completion times
- Token transfer confirmations
- User registration trends
- Gas fee optimization
- API response times

### Logging
```javascript
// Transaction logging
console.log(`✅ Transaction completed: ${txHash}`);
console.log(`💰 Amount: ${amount} INR → ${tokenAmount} ${tokenType}`);
console.log(`👤 User: ${user.email} | Wallet: ${walletAddress}`);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**This is a demonstration application for educational purposes.**

- Uses Aptos testnet (no real tokens)
- Uses Razorpay test mode (no real payments)
- Smart contracts are not audited
- Not suitable for production without security audits

## 🆘 Support

### Documentation
- [Aptos Documentation](https://aptos.dev/)
- [Razorpay API Docs](https://razorpay.com/docs/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/)

### Community
- [Aptos Discord](https://discord.gg/aptosnetwork)
- [Razorpay Support](https://razorpay.com/support/)
- [GitHub Issues](../../issues)

### Quick Links
- **Demo**: http://localhost:5173
- **API**: http://localhost:3001/api
- **Explorer**: https://explorer.aptoslabs.com/?network=testnet
- **Faucet**: https://aptoslabs.com/testnet-faucet

---

**Built with ❤️ for the Web3 community**

*Ready for hackathon demos and educational use!*
