#!/bin/bash

echo "🚀 Setting up Aptos OnRamp Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version check passed: $(node --version)"

# Setup Backend
print_info "Setting up backend..."
cd backend

if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    print_error "Backend npm install failed!"
    exit 1
fi

print_status "Backend dependencies installed"

# Setup environment file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env file from .env.example. Please update with your actual credentials:"
        print_info "  - RAZORPAY_KEY_ID: Get from https://dashboard.razorpay.com/"
        print_info "  - RAZORPAY_KEY_SECRET: Get from https://dashboard.razorpay.com/"
        print_info "  - APTOS_PRIVATE_KEY: Generate using Aptos CLI or our script"
    else
        print_error ".env.example file not found!"
        exit 1
    fi
fi

# Setup Frontend
print_info "Setting up frontend..."
cd ../frontend

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    print_error "Frontend npm install failed!"
    exit 1
fi

print_status "Frontend dependencies installed"

# Setup environment file for frontend
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created frontend .env file"
    fi
fi

# Setup Contracts (Optional)
print_info "Setting up smart contracts..."
cd ../contracts

# Check if Aptos CLI is installed
if command -v aptos &> /dev/null; then
    print_status "Aptos CLI found: $(aptos --version)"
    
    # Initialize Aptos profile if not exists
    if [ ! -d ".aptos" ]; then
        print_info "Initializing Aptos CLI profile..."
        aptos init --network testnet --assume-yes
        print_status "Aptos CLI profile initialized"
        
        # Fund the account
        print_info "Funding account with test APT..."
        aptos account fund-with-faucet --account default
        print_status "Account funded with test APT"
    fi
    
    # Compile contracts
    print_info "Compiling Move contracts..."
    aptos move compile
    if [ $? -eq 0 ]; then
        print_status "Move contracts compiled successfully"
    else
        print_warning "Move contract compilation failed (this is optional for basic testing)"
    fi
else
    print_warning "Aptos CLI not found. Smart contract deployment will be skipped."
    print_info "To install Aptos CLI: curl -fsSL 'https://aptos.dev/scripts/install_cli.py' | python3"
fi

# Final setup complete
cd ..

print_status "Setup completed successfully!"
echo ""
print_info "Next steps:"
echo "1. 🔑 Update backend/.env with your Razorpay credentials"
echo "2. 🚀 Start backend: cd backend && npm run dev"
echo "3. 🌐 Start frontend: cd frontend && npm run dev"
echo "4. 🌍 Open browser: http://localhost:5173"
echo ""
print_info "Useful links:"
echo "- Razorpay Dashboard: https://dashboard.razorpay.com/"
echo "- Petra Wallet: https://petra.app/"
echo "- Aptos Testnet Faucet: https://aptoslabs.com/testnet-faucet"
echo "- Aptos Explorer: https://explorer.aptoslabs.com/?network=testnet"
echo ""
print_warning "Remember: This is a testnet application. No real money is involved!"
