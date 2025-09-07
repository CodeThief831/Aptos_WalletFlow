#!/bin/bash

# Aptos contract deployment script for OnRamp module

echo "🚀 Deploying OnRamp contract to Aptos Testnet..."

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first:"
    echo "curl -fsSL \"https://aptos.dev/scripts/install_cli.py\" | python3"
    exit 1
fi

# Initialize Aptos account if not exists
if [ ! -f ".aptos/config.yaml" ]; then
    echo "🔧 Initializing Aptos account..."
    aptos init --network testnet
fi

# Fund the account
echo "💰 Funding account with test APT..."
aptos account fund-with-faucet --account default

# Compile the contract
echo "📦 Compiling Move contract..."
aptos move compile

# Publish the contract
echo "📤 Publishing contract to testnet..."
aptos move publish --named-addresses onramp_addr=default

echo "✅ Contract deployed successfully!"
echo "💡 Save the contract address for your backend configuration."
