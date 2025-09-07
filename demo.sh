#!/bin/bash

echo "🎬 Aptos OnRamp Demo Script"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}📍 $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_demo() {
    echo -e "${YELLOW}🎭 $1${NC}"
}

echo ""
print_step "STEP 1: Application Overview"
print_info "Aptos OnRamp is a fiat-to-crypto application that allows users to:"
print_info "- Buy APT and USDC tokens with Indian Rupees"
print_info "- Use popular payment methods (UPI, Cards, Net Banking)"
print_info "- Receive tokens instantly in their Aptos wallet"
echo ""

print_step "STEP 2: Technical Architecture"
print_info "Frontend: React + TailwindCSS + Aptos Wallet Adapter"
print_info "Backend: Express.js + Razorpay API + Aptos SDK"
print_info "Blockchain: Aptos Testnet + Move Smart Contracts"
print_info "Payment: Razorpay (Test Mode)"
echo ""

print_step "STEP 3: User Journey Demo"
print_demo "1. User visits http://localhost:5173"
print_demo "2. User clicks 'Connect Petra Wallet' button"
print_demo "3. Petra wallet extension opens for connection"
print_demo "4. User enters INR amount (e.g., ₹1000)"
print_demo "5. User selects token type (APT or USDC)"
print_demo "6. System shows conversion: ₹1000 → 100 APT"
print_demo "7. User clicks 'Pay ₹1000 with Razorpay'"
print_demo "8. Razorpay checkout opens with test payment options"
print_demo "9. User completes payment using test card"
print_demo "10. Backend verifies payment signature"
print_demo "11. Backend transfers tokens to user's wallet"
print_demo "12. User sees success message with transaction hash"
print_demo "13. User can view transaction on Aptos Explorer"
echo ""

print_step "STEP 4: Key Features Demonstrated"
print_info "✅ Wallet Integration: Seamless Petra wallet connection"
print_info "✅ Payment Processing: Secure Razorpay integration"
print_info "✅ Real-time Rates: Dynamic conversion rate display"
print_info "✅ Instant Transfer: Immediate token delivery"
print_info "✅ Transaction Tracking: Aptos Explorer integration"
print_info "✅ Error Handling: Comprehensive error management"
print_info "✅ Security: Payment verification and rate limiting"
echo ""

print_step "STEP 5: Test Scenarios"
print_demo "Scenario A: Successful APT Purchase"
print_info "- Amount: ₹500"
print_info "- Token: APT"
print_info "- Expected: 50 APT tokens in wallet"
print_info "- Payment: Test card 4111 1111 1111 1111"

print_demo "Scenario B: Successful USDC Purchase"
print_info "- Amount: ₹830"
print_info "- Token: USDC"
print_info "- Expected: 10 USDC tokens in wallet"
print_info "- Payment: Test card 4111 1111 1111 1111"

print_demo "Scenario C: Failed Payment"
print_info "- Amount: ₹1000"
print_info "- Token: APT"
print_info "- Payment: Test card 4000 0000 0000 0002"
print_info "- Expected: Payment failure, no tokens transferred"
echo ""

print_step "STEP 6: Smart Contract Interaction"
print_info "APT Transfer: Direct blockchain transfer using Aptos SDK"
print_info "USDC Minting: Custom Move contract function call"
print_info "Contract Address: Available after deployment"
print_info "Functions: mint_usdc(), transfer_usdc(), transfer_apt()"
echo ""

print_step "STEP 7: Monitoring & Verification"
print_info "Backend Logs: Real-time transaction logging"
print_info "Aptos Explorer: Transaction verification"
print_info "Wallet Balance: Real-time balance updates"
print_info "Payment Dashboard: Razorpay transaction tracking"
echo ""

print_step "STEP 8: Security Features"
print_info "🔒 Payment Verification: Razorpay signature validation"
print_info "🔒 Rate Limiting: API abuse prevention"
print_info "🔒 Input Validation: Comprehensive data sanitization"
print_info "🔒 CORS Protection: Cross-origin request restrictions"
print_info "🔒 Environment Variables: Sensitive data protection"
echo ""

print_step "Demo Ready!"
print_info "Both servers are running and ready for demonstration:"
print_info "Frontend: http://localhost:5173"
print_info "Backend: http://localhost:3001"
print_info ""
print_info "Test Credentials:"
print_info "Razorpay Test Card: 4111 1111 1111 1111"
print_info "CVV: Any 3 digits"
print_info "Expiry: Any future date"
print_info ""
print_demo "🎯 Ready to demonstrate the complete fiat-to-crypto flow!"
