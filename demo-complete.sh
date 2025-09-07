#!/bin/bash

# ===========================================
# Aptos OnRamp - Complete Demo Script
# ===========================================

echo "🚀 Starting Aptos OnRamp Complete Demo"
echo "====================================="

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${CYAN}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if node and npm are installed
check_dependencies() {
    print_step "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    print_success "Node.js and npm are installed"
}

# Setup backend
setup_backend() {
    print_step "Setting up backend..."
    
    cd backend
    
    if [ ! -f ".env" ]; then
        print_info "Creating backend .env file from example..."
        cp .env.example .env
        print_warning "Please edit backend/.env with your actual API keys before running the demo"
    fi
    
    print_info "Installing backend dependencies..."
    npm install
    
    print_success "Backend setup complete"
    cd ..
}

# Setup frontend
setup_frontend() {
    print_step "Setting up frontend..."
    
    cd frontend
    
    if [ ! -f ".env" ]; then
        print_info "Creating frontend .env file from example..."
        cp .env.example .env
        print_warning "Please edit frontend/.env with your actual configuration"
    fi
    
    print_info "Installing frontend dependencies..."
    npm install
    
    print_success "Frontend setup complete"
    cd ..
}

# Setup contracts
setup_contracts() {
    print_step "Setting up smart contracts..."
    
    cd contracts
    
    print_info "Installing contract dependencies..."
    if [ -f "package.json" ]; then
        npm install
    fi
    
    print_info "Making publish script executable..."
    chmod +x publish.sh
    
    print_warning "To deploy contracts, run: cd contracts && ./publish.sh"
    print_success "Contracts setup complete"
    cd ..
}

# Start development servers
start_servers() {
    print_step "Starting development servers..."
    
    # Check if MongoDB is needed
    if command -v mongod &> /dev/null; then
        print_info "MongoDB detected. Make sure it's running: sudo systemctl start mongod"
    else
        print_warning "MongoDB not detected. Install MongoDB or use a cloud database"
    fi
    
    print_info "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    print_info "Starting frontend server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    sleep 3
    
    print_success "Development servers started!"
    echo -e "${PURPLE}🌐 Frontend: http://localhost:5173${NC}"
    echo -e "${PURPLE}🔧 Backend: http://localhost:3001${NC}"
    echo -e "${PURPLE}📊 Health Check: http://localhost:3001/health${NC}"
}

# Test the application
test_application() {
    print_step "Testing application endpoints..."
    
    # Test backend health
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
    fi
    
    # Test conversion rates endpoint
    if curl -s http://localhost:3001/api/payments/rates > /dev/null; then
        print_success "Conversion rates API is working"
    else
        print_warning "Conversion rates API not responding (may need authentication)"
    fi
    
    print_info "Manual testing checklist:"
    echo "  □ Visit http://localhost:5173"
    echo "  □ Connect Petra wallet"
    echo "  □ Register/Login with email"
    echo "  □ Enter amount and select token"
    echo "  □ Complete Razorpay payment flow"
    echo "  □ Verify token receipt"
    echo "  □ Check transaction on Aptos Explorer"
}

# Show configuration help
show_configuration_help() {
    print_step "Configuration Help"
    
    echo -e "${YELLOW}📋 Required Configuration:${NC}"
    echo ""
    echo -e "${BLUE}1. Razorpay Setup:${NC}"
    echo "   • Create account at https://dashboard.razorpay.com/"
    echo "   • Get API Key ID and Secret"
    echo "   • Add to backend/.env"
    echo ""
    echo -e "${BLUE}2. Aptos Setup:${NC}"
    echo "   • Generate private key with Aptos CLI"
    echo "   • Fund testnet account from faucet"
    echo "   • Deploy contracts with ./contracts/publish.sh"
    echo "   • Add private key and contract address to backend/.env"
    echo ""
    echo -e "${BLUE}3. Database Setup:${NC}"
    echo "   • Install MongoDB locally OR"
    echo "   • Use MongoDB Atlas cloud database"
    echo "   • Update MONGODB_URI in backend/.env"
    echo ""
    echo -e "${BLUE}4. JWT Setup:${NC}"
    echo "   • Generate strong JWT secret"
    echo "   • Add to backend/.env"
}

# Show demo features
show_demo_features() {
    print_step "Demo Features Overview"
    
    echo -e "${PURPLE}🎯 Main Features:${NC}"
    echo "  ✨ Fiat-to-Crypto On-Ramp (INR → APT/USDC)"
    echo "  🔐 User Authentication & Registration"
    echo "  💳 Razorpay Payment Integration"
    echo "  🔗 Petra Wallet Connection"
    echo "  📱 Responsive Modern UI"
    echo "  📊 Transaction Dashboard"
    echo "  ⛽ Gas Fee Estimation"
    echo "  🎉 Success Modal with Explorer Links"
    echo ""
    echo -e "${PURPLE}🔧 Technical Features:${NC}"
    echo "  🚀 React + Vite Frontend"
    echo "  ⚡ Express.js Backend"
    echo "  🍃 MongoDB Database"
    echo "  🔒 JWT Authentication"
    echo "  🏗️ Move Smart Contracts"
    echo "  🌐 Aptos SDK Integration"
    echo "  🛡️ Rate Limiting & Security"
    echo "  📝 Comprehensive Error Handling"
}

# Cleanup function
cleanup() {
    print_step "Cleaning up..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        print_info "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        print_info "Frontend server stopped"
    fi
    
    print_success "Cleanup complete"
}

# Main execution
main() {
    # Handle Ctrl+C
    trap cleanup EXIT
    
    case "${1:-setup}" in
        "setup")
            check_dependencies
            setup_backend
            setup_frontend
            setup_contracts
            show_configuration_help
            ;;
        "start")
            start_servers
            test_application
            echo ""
            print_success "Demo is running! Press Ctrl+C to stop"
            echo ""
            show_demo_features
            
            # Keep the script running
            wait
            ;;
        "test")
            test_application
            ;;
        "help")
            echo -e "${CYAN}Aptos OnRamp Demo Script${NC}"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup   - Install dependencies and setup project (default)"
            echo "  start   - Start development servers"
            echo "  test    - Test application endpoints"
            echo "  help    - Show this help message"
            echo ""
            show_demo_features
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
