# Aptos OnRamp - Fiat to Crypto Application

A comprehensive fiat-to-crypto on-ramp application built with React, Express, and Aptos blockchain. Users can buy APT and USDC tokens using Indian Rupees through Razorpay payment integration.

## 🚀 Features

- **Wallet Integration**: Petra wallet connection using Aptos wallet adapter
- **Payment Processing**: Razorpay integration for INR payments
- **Token Transfer**: Instant APT and USDC token transfers on Aptos testnet
- **Real-time Rates**: Dynamic conversion rates display
- **Secure Backend**: Express.js backend with proper error handling
- **Smart Contracts**: Move contracts for USDC minting and transfer operations
- **Responsive UI**: Modern TailwindCSS-powered interface

## 🛠 Tech Stack

### Frontend
- **Framework**: Vite + React 18
- **Styling**: TailwindCSS
- **Wallet**: Aptos Wallet Adapter + Petra Plugin
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js + Express
- **Payment**: Razorpay API
- **Blockchain**: Aptos SDK for TypeScript
- **Security**: Helmet, CORS, Rate Limiting

### Blockchain
- **Network**: Aptos Testnet
- **Smart Contracts**: Move language
- **Tokens**: APT (native) + Test USDC (custom)

## 📁 Project Structure

```
aptos-onramp/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts (Wallet)
│   │   ├── App.jsx          # Main application component
│   │   └── main.jsx         # Application entry point
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                 # Express backend API
│   ├── index.js             # Main server file
│   ├── .env.example         # Environment variables template
│   └── package.json         # Backend dependencies
├── contracts/               # Move smart contracts
│   ├── OnRamp.move          # Main OnRamp contract
│   ├── Move.toml            # Move package configuration
│   ├── publish.sh           # Shell deployment script
│   └── publish.ts           # TypeScript deployment script
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Git installed
- Aptos CLI (optional, for contract deployment)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aptos-onramp
```

### 2. Setup Backend

```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# - Add Razorpay API keys
# - Add Aptos private key
# - Configure other variables
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install

# Copy environment file (optional)
cp .env.example .env
```

### 4. Deploy Smart Contract (Optional)

```bash
cd ../contracts

# Using shell script (requires Aptos CLI)
chmod +x publish.sh
./publish.sh

# OR using TypeScript
npm install -g ts-node
ts-node publish.ts
```

### 5. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🔧 Configuration

### Backend Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Razorpay Configuration (Get from https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Aptos Configuration
APTOS_PRIVATE_KEY=your_aptos_private_key_here
APTOS_CONTRACT_ADDRESS=your_contract_address_here
APTOS_NETWORK=testnet

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Razorpay Setup

1. Create account at [Razorpay](https://dashboard.razorpay.com/)
2. Enable test mode
3. Get API Key ID and Secret from API Keys section
4. Add webhook URL: `http://localhost:3001/api/verify-payment`

### Aptos Wallet Setup

1. Install [Petra Wallet](https://petra.app/) extension
2. Create new wallet or import existing
3. Switch to Testnet network
4. Get test APT from [Aptos Faucet](https://aptoslabs.com/testnet-faucet)

## 📱 Usage

### For Users

1. **Connect Wallet**: Click "Connect Petra Wallet" to link your wallet
2. **Enter Amount**: Input the INR amount you want to spend
3. **Select Token**: Choose between APT or USDC
4. **Pay**: Click "Pay with Razorpay" and complete payment
5. **Receive**: Tokens will be instantly transferred to your wallet

### For Developers

#### API Endpoints

- `GET /health` - Health check
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment and transfer tokens
- `POST /api/transfer-tokens` - Manual token transfer
- `GET /api/balance/:address/:token` - Get token balance
- `GET /api/rates` - Get conversion rates

#### Smart Contract Functions

- `initialize(admin)` - Initialize the contract
- `mint_usdc(admin, recipient, amount)` - Mint USDC to recipient
- `transfer_usdc(sender, recipient, amount)` - Transfer USDC
- `transfer_apt(sender, recipient, amount)` - Transfer APT

## 🔒 Security Features

- **Payment Verification**: Razorpay signature validation
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes all user inputs
- **CORS Protection**: Restricts cross-origin requests
- **Helmet Security**: Sets security headers
- **Environment Variables**: Sensitive data protection

## 🧪 Testing

### Test Mode

The application runs in test mode by default:
- Razorpay test payments (no real money)
- Aptos testnet (no real tokens)
- Test USDC (custom token for testing)

### Manual Testing

1. **Wallet Connection**: Test Petra wallet integration
2. **Payment Flow**: Use Razorpay test cards
3. **Token Transfer**: Verify tokens appear in wallet
4. **Balance Display**: Check balance updates
5. **Error Handling**: Test various error scenarios

### Test Payment Cards

Use these test cards with Razorpay:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- Any future expiry date and CVV

## 🚀 Deployment

### Backend Deployment

1. **Environment**: Set production environment variables
2. **Database**: Configure if needed for persistence
3. **Scaling**: Use PM2 or similar for process management
4. **Monitoring**: Add logging and monitoring

### Frontend Deployment

1. **Build**: `npm run build`
2. **Static Hosting**: Deploy to Vercel, Netlify, or similar
3. **Environment**: Set production API URLs

### Smart Contract Deployment

1. **Mainnet**: Switch to mainnet for production
2. **Funding**: Fund deployer account
3. **Verification**: Verify contract on explorer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

This is a demonstration application for educational purposes. It uses:
- Aptos testnet (no real tokens)
- Razorpay test mode (no real payments)
- Test smart contracts (not audited)

Do not use this for real financial transactions without proper security audits and compliance checks.

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Open GitHub issues for bugs and feature requests
- **Community**: Join Aptos Discord for blockchain-related questions

## 🔗 Links

- [Aptos Documentation](https://aptos.dev/)
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Petra Wallet](https://petra.app/)
- [TailwindCSS](https://tailwindcss.com/)
- [React](https://react.dev/)

---

**Built with ❤️ for the Indian crypto community**
