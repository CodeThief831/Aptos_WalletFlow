#!/bin/bash

# Aptos OnRamp Contract Deployment Script
# This script deploys all contracts to Aptos testnet/mainnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"  # Change to "mainnet" for production
PROFILE_NAME="onramp-deployer"

echo -e "${BLUE}🚀 Aptos OnRamp Contract Deployment${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo -e "${RED}❌ Aptos CLI is not installed. Please install it first:${NC}"
    echo "curl -fsSL https://aptos.dev/scripts/install_cli.py | python3"
    exit 1
fi

# Check if profile exists
if ! aptos config show-profiles | grep -q "$PROFILE_NAME"; then
    echo -e "${YELLOW}⚠️  Profile '$PROFILE_NAME' not found. Creating new profile...${NC}"
    
    echo -e "${BLUE}Please enter your private key (or press Enter to generate a new one):${NC}"
    read -s PRIVATE_KEY
    
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${YELLOW}Generating new account...${NC}"
        aptos init --profile $PROFILE_NAME --network $NETWORK
    else
        echo -e "${YELLOW}Using provided private key...${NC}"
        aptos init --profile $PROFILE_NAME --network $NETWORK --private-key $PRIVATE_KEY
    fi
else
    echo -e "${GREEN}✅ Profile '$PROFILE_NAME' found${NC}"
fi

# Get deployer address
DEPLOYER_ADDRESS=$(aptos config show-profiles --profile=$PROFILE_NAME | grep "account" | awk '{print $2}')
echo -e "${BLUE}Deployer address: $DEPLOYER_ADDRESS${NC}"

# Check balance
BALANCE=$(aptos account balance --profile=$PROFILE_NAME | grep "apt" | awk '{print $1}')
echo -e "${BLUE}Current balance: $BALANCE APT${NC}"

if [ "$BALANCE" -lt "100000000" ]; then  # Less than 1 APT
    echo -e "${YELLOW}⚠️  Low balance detected. You may need to fund your account.${NC}"
    if [ "$NETWORK" = "testnet" ]; then
        echo -e "${BLUE}Requesting testnet faucet...${NC}"
        aptos account fund-with-faucet --profile=$PROFILE_NAME
    else
        echo -e "${RED}❌ Please fund your mainnet account before deploying${NC}"
        exit 1
    fi
fi

# Update Move.toml with deployer address
echo -e "${BLUE}📝 Updating Move.toml with deployer address...${NC}"
sed -i.bak "s/onramp_addr = \"_\"/onramp_addr = \"$DEPLOYER_ADDRESS\"/" Move.toml

# Compile contracts
echo -e "${BLUE}🔨 Compiling contracts...${NC}"
if ! aptos move compile --profile=$PROFILE_NAME; then
    echo -e "${RED}❌ Compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Compilation successful${NC}"

# Deploy contracts
echo -e "${BLUE}🚀 Deploying contracts to $NETWORK...${NC}"

# Deploy with max gas
if aptos move publish --profile=$PROFILE_NAME --max-gas=100000; then
    echo -e "${GREEN}✅ Contracts deployed successfully!${NC}"
    
    # Save deployment info
    DEPLOYMENT_FILE="deployment_${NETWORK}_$(date +%Y%m%d_%H%M%S).json"
    cat > $DEPLOYMENT_FILE << EOF
{
  "network": "$NETWORK",
  "deployer_address": "$DEPLOYER_ADDRESS",
  "deployment_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "OnRamp": "$DEPLOYER_ADDRESS::OnRamp",
    "PriceOracle": "$DEPLOYER_ADDRESS::PriceOracle", 
    "Treasury": "$DEPLOYER_ADDRESS::Treasury",
    "KYCModule": "$DEPLOYER_ADDRESS::KYCModule"
  },
  "initialization_required": true
}
EOF
    
    echo -e "${GREEN}✅ Deployment info saved to: $DEPLOYMENT_FILE${NC}"
    
    # Initialize contracts
    echo -e "${BLUE}🔧 Initializing contracts...${NC}"
    
    # Initialize OnRamp (with treasury address as deployer for simplicity)
    if aptos move run --function-id="$DEPLOYER_ADDRESS::OnRamp::initialize" --args address:$DEPLOYER_ADDRESS --profile=$PROFILE_NAME; then
        echo -e "${GREEN}✅ OnRamp initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  OnRamp initialization failed (may already be initialized)${NC}"
    fi
    
    # Initialize PriceOracle
    if aptos move run --function-id="$DEPLOYER_ADDRESS::PriceOracle::initialize" --profile=$PROFILE_NAME; then
        echo -e "${GREEN}✅ PriceOracle initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  PriceOracle initialization failed (may already be initialized)${NC}"
    fi
    
    # Initialize Treasury
    if aptos move run --function-id="$DEPLOYER_ADDRESS::Treasury::initialize" --profile=$PROFILE_NAME; then
        echo -e "${GREEN}✅ Treasury initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  Treasury initialization failed (may already be initialized)${NC}"
    fi
    
    # Initialize KYC Module
    if aptos move run --function-id="$DEPLOYER_ADDRESS::KYCModule::initialize" --profile=$PROFILE_NAME; then
        echo -e "${GREEN}✅ KYC Module initialized${NC}"
    else
        echo -e "${YELLOW}⚠️  KYC Module initialization failed (may already be initialized)${NC}"
    fi
    
    echo -e "${GREEN}🎉 Deployment and initialization complete!${NC}"
    echo -e "${BLUE}Contract addresses:${NC}"
    echo -e "  OnRamp: $DEPLOYER_ADDRESS::OnRamp"
    echo -e "  PriceOracle: $DEPLOYER_ADDRESS::PriceOracle"
    echo -e "  Treasury: $DEPLOYER_ADDRESS::Treasury"
    echo -e "  KYCModule: $DEPLOYER_ADDRESS::KYCModule"
    
    echo -e "${BLUE}🔗 Explorer links:${NC}"
    if [ "$NETWORK" = "testnet" ]; then
        echo -e "  Account: https://explorer.aptoslabs.com/account/$DEPLOYER_ADDRESS?network=testnet"
    else
        echo -e "  Account: https://explorer.aptoslabs.com/account/$DEPLOYER_ADDRESS"
    fi
    
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo -e "  1. Update your backend configuration with the contract address: $DEPLOYER_ADDRESS"
    echo -e "  2. Test the contract functions using the Aptos CLI or your frontend"
    echo -e "  3. Set up price oracle feeds if needed"
    echo -e "  4. Configure KYC verification processes"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Restore original Move.toml
mv Move.toml.bak Move.toml

echo -e "${GREEN}✅ Deployment script completed${NC}"
