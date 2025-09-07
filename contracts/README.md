# Aptos OnRamp Smart Contracts

This directory contains the complete smart contract suite for the Aptos OnRamp project, enabling seamless conversion between Indian Rupees (INR) and cryptocurrency tokens (APT, USDC).

## 📁 Contract Overview

### 1. **OnRamp.move** - Core OnRamp/OffRamp Logic
- **Purpose**: Main contract handling token minting, transfers, and withdrawal requests
- **Key Features**:
  - Process INR to crypto conversions (OnRamp)
  - Handle crypto to INR withdrawals (OffRamp)
  - Exchange rate management
  - Fee calculation and collection
  - Withdrawal request lifecycle management
  - Event emission for transaction tracking

### 2. **PriceOracle.move** - Price Feed Management
- **Purpose**: Provides real-time exchange rates for supported tokens
- **Key Features**:
  - Multi-token price feeds (APT, USDC, BTC, ETH)
  - Authorized price updater system
  - Price staleness checks
  - Confidence level tracking
  - Batch price updates

### 3. **Treasury.move** - Fund Management
- **Purpose**: Manages platform liquidity and fund security
- **Key Features**:
  - Daily withdrawal limits
  - Minimum reserve requirements
  - Multi-signature-like operations
  - Emergency withdrawal functions
  - Operator authorization system

### 4. **KYCModule.move** - Compliance & Verification
- **Purpose**: Handles user verification and transaction limits
- **Key Features**:
  - Multi-level KYC verification (0-3)
  - Transaction limit enforcement
  - Document hash storage
  - Verification expiry management
  - Compliance checking for transactions

## 🚀 Deployment Instructions

### Prerequisites
1. Install Aptos CLI:
   ```bash
   curl -fsSL https://aptos.dev/scripts/install_cli.py | python3
   ```

2. Create/fund an Aptos account:
   ```bash
   aptos init --profile onramp-deployer --network testnet
   aptos account fund-with-faucet --profile onramp-deployer  # For testnet
   ```

### Quick Deployment
1. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

### Manual Deployment
1. Compile contracts:
   ```bash
   aptos move compile --profile onramp-deployer
   ```

2. Deploy contracts:
   ```bash
   aptos move publish --profile onramp-deployer --max-gas=100000
   ```

3. Initialize contracts (replace `YOUR_ADDRESS` with your actual address):
   ```bash
   # Initialize OnRamp with treasury address
   aptos move run --function-id="YOUR_ADDRESS::OnRamp::initialize" \
     --args address:YOUR_ADDRESS --profile onramp-deployer

   # Initialize PriceOracle
   aptos move run --function-id="YOUR_ADDRESS::PriceOracle::initialize" \
     --profile onramp-deployer

   # Initialize Treasury
   aptos move run --function-id="YOUR_ADDRESS::Treasury::initialize" \
     --profile onramp-deployer

   # Initialize KYC Module
   aptos move run --function-id="YOUR_ADDRESS::KYCModule::initialize" \
     --profile onramp-deployer
   ```

## 📋 Contract Configuration

### Initial Setup After Deployment

1. **Set Exchange Rates** (PriceOracle):
   ```bash
   aptos move run --function-id="YOUR_ADDRESS::PriceOracle::update_price" \
     --args string:APT u64:1000 u64:95 --profile onramp-deployer
   ```

2. **Configure Treasury Limits**:
   ```bash
   aptos move run --function-id="YOUR_ADDRESS::Treasury::set_limits" \
     --args string:APT u64:100000000 u64:10000000000 --profile onramp-deployer
   ```

3. **Set KYC Requirements**:
   ```bash
   aptos move run --function-id="YOUR_ADDRESS::KYCModule::set_required_withdrawal_level" \
     --args u8:1 --profile onramp-deployer
   ```

## 🔧 Integration with Backend

Update your backend configuration with the deployed contract address:

```javascript
// backend/services/aptosService.js
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_ADDRESS";

// Example: Process OnRamp transaction
async function processOnRamp(recipientAddress, inrAmount, tokenType, paymentId) {
  const transaction = {
    function: `${CONTRACT_ADDRESS}::OnRamp::process_onramp`,
    arguments: [recipientAddress, inrAmount, tokenType, paymentId],
    type_arguments: []
  };
  
  return await aptosClient.generateTransaction(adminAccount.address(), transaction);
}
```

## 📊 Key Functions Reference

### OnRamp Contract
- `process_onramp(recipient, inr_amount, token_type, payment_id)` - Process INR to crypto
- `create_withdrawal_request(amount, token_type)` - Create withdrawal request
- `process_withdrawal(withdrawal_id, tx_hash, status)` - Process withdrawal
- `update_exchange_rate(token_type, new_rate)` - Update exchange rates
- `get_withdrawal_request(withdrawal_id)` - Get withdrawal details

### PriceOracle Contract
- `update_price(symbol, price, confidence)` - Update token price
- `get_price(symbol)` - Get current price with staleness check
- `batch_update_prices(symbols[], prices[], confidences[])` - Batch update

### Treasury Contract
- `deposit_apt(amount)` - Deposit APT to treasury
- `withdraw_apt(recipient, amount, reason)` - Withdraw APT from treasury
- `get_balances()` - Get treasury balances
- `get_daily_withdrawal_status(token)` - Check daily limits

### KYC Module
- `verify_user(user, level, document_hash, metadata)` - Verify user KYC
- `check_kyc_compliance(user, amount, is_withdrawal)` - Check compliance
- `get_kyc_status(user)` - Get user verification status
- `get_kyc_limits(level)` - Get limits for KYC level

## 🔒 Security Features

1. **Access Control**: Admin-only functions with proper authorization checks
2. **Daily Limits**: Configurable withdrawal limits to prevent abuse
3. **Minimum Reserves**: Ensure treasury maintains minimum balances
4. **KYC Compliance**: Transaction limits based on verification levels
5. **Event Logging**: Comprehensive event emission for audit trails
6. **Pause Functionality**: Emergency pause capabilities for all contracts

## 🧪 Testing

Test contract functions using Aptos CLI:

```bash
# Test OnRamp function
aptos move run --function-id="YOUR_ADDRESS::OnRamp::process_onramp" \
  --args address:USER_ADDRESS u64:100000 string:APT string:test_payment_123 \
  --profile onramp-deployer

# Test price oracle
aptos move run --function-id="YOUR_ADDRESS::PriceOracle::get_price" \
  --args string:APT --profile onramp-deployer
```

## 📝 Event Monitoring

Monitor contract events for real-time transaction tracking:

```javascript
// Example: Listen for OnRamp events
const events = await aptosClient.getEventsByEventHandle(
  adminAddress,
  `${CONTRACT_ADDRESS}::OnRamp::OnRampEvents`,
  "onramp_events"
);
```

## 🌐 Mainnet Deployment

For mainnet deployment:

1. Change `NETWORK="mainnet"` in `deploy.sh`
2. Ensure sufficient APT balance for gas fees
3. Update backend configuration with mainnet contract address
4. Test thoroughly on testnet before mainnet deployment

## 📞 Support

For questions about the smart contracts:
- Review the inline code comments for detailed function explanations
- Check the Aptos documentation: https://aptos.dev/
- Test on testnet before any mainnet operations

## ⚠️ Important Notes

1. **Gas Fees**: Ensure sufficient APT balance for deployment and initialization
2. **Address Management**: Keep your private key secure and backup deployment info
3. **Testing**: Always test on testnet before mainnet deployment
4. **Upgrades**: These contracts are not upgradeable; redeploy for changes
5. **Treasury Management**: Set appropriate limits based on your business requirements
