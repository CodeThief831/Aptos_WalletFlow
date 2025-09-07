const { Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');
const fs = require('fs');
const path = require('path');

// Generate a new Aptos account
function generateAptosAccount() {
  const account = Account.generate();
  
  console.log('🔑 Generated new Aptos account:');
  console.log('Address:', account.accountAddress.toString());
  console.log('Private Key:', account.privateKey.toString());
  console.log('Public Key:', account.publicKey.toString());
  
  // Create .env file if it doesn't exist
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = `
# Aptos Configuration
APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=${account.privateKey.toString()}
APTOS_PUBLIC_KEY=${account.publicKey.toString()}
APTOS_ADDRESS=${account.accountAddress.toString()}

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/aptos-onramp

# JWT Configuration
JWT_SECRET=aptos-onramp-secret-2024-${Date.now()}

# Razorpay Configuration (get from Razorpay dashboard)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent.trim());
    console.log('✅ Created .env file with account details');
  } else {
    console.log('⚠️ .env file already exists. Please update manually:');
    console.log(`APTOS_PRIVATE_KEY=${account.privateKey.toString()}`);
    console.log(`APTOS_ADDRESS=${account.accountAddress.toString()}`);
  }
  
  console.log('\n📧 Next steps:');
  console.log('1. Fund your account with testnet APT: https://faucet.aptoslabs.com');
  console.log(`2. Use address: ${account.accountAddress.toString()}`);
  console.log('3. Update Razorpay credentials in .env file');
  console.log('4. Restart the backend server');
  
  return account;
}

if (require.main === module) {
  generateAptosAccount();
}

module.exports = { generateAptosAccount };
