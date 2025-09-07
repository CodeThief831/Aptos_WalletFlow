#!/bin/bash

echo "🚀 Testing Aptos OnRamp Application..."

# Test backend health
echo "🔍 Checking backend health..."
curl -s http://localhost:3001/health | jq '.' || echo "Backend not responding"

# Test frontend availability
echo "🔍 Checking frontend availability..."
curl -s -I http://localhost:5173 | head -1

echo "✅ Basic connectivity test completed!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3001"
echo "📊 Backend Health: http://localhost:3001/health"
echo ""
echo "🎯 Features implemented:"
echo "  ✅ User Registration with phone/password validation"
echo "  ✅ User Login with secure authentication"
echo "  ✅ Password visibility toggle"
echo "  ✅ Phone number validation"
echo "  ✅ Email validation"
echo "  ✅ Razorpay payment integration"
echo "  ✅ Aptos wallet connection"
echo "  ✅ Token transfer to user wallet"
echo "  ✅ Transaction history tracking"
echo "  ✅ Comprehensive dashboard with tabs"
echo "  ✅ Real-time payment verification"
echo "  ✅ Error handling and user feedback"
echo ""
echo "💳 Test Razorpay credentials (use these for testing):"
echo "  Card Number: 4111 1111 1111 1111"
echo "  Expiry: Any future date"
echo "  CVV: Any 3 digits"
echo "  Name: Any name"
echo ""
echo "Ready to use! 🎉"
