const {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
} = require("@aptos-labs/ts-sdk");
class AptosService {
  constructor() {
    this.aptos = null;
    this.account = null;
    this.isInitialized = false;
    this.network = process.env.APTOS_NETWORK || "testnet";
  }
  async toHexString(byteArray) {
    return (
      "0x" +
      Array.from(byteArray, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
      )
    );
  }

  async initialize() {
    try {
      console.log(`🚀 Initializing Aptos service on ${this.network}...`);

      // Initialize Aptos client
      const config = new AptosConfig({
        network: this.network === "testnet" ? Network.TESTNET : Network.MAINNET,
      });
      this.aptos = new Aptos(config);

      // Initialize account from private key
      if (process.env.APTOS_PRIVATE_KEY) {
        try {
          const privateKey = new Ed25519PrivateKey(
            process.env.APTOS_PRIVATE_KEY
          );
          this.account = Account.fromPrivateKey({ privateKey });
          console.log(
            `✅ Aptos account loaded: ${this.account.accountAddress.toString()}`
          );
        } catch (error) {
          console.warn("⚠️ Invalid private key provided, using demo account");
          // Generate a demo account for testing
          this.account = Account.generate();
          console.log(
            `🔧 Demo account generated: ${this.account.accountAddress.toString()}`
          );
        }
      } else {
        console.warn("⚠️ No private key provided, using demo account");
        this.account = Account.generate();
        console.log(
          `🔧 Demo account generated: ${this.account.accountAddress.toString()}`
        );
      }

      // Check account balance
      await this.checkAccountBalance();

      this.isInitialized = true;
      console.log("✅ Aptos service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Aptos service:", error);
      throw error;
    }
  }

  async checkAccountBalance() {
    try {
      const balance = await this.aptos.getAccountAPTAmount({
        accountAddress: this.account.accountAddress,
      });
      const hexAddress = await this.toHexString(
        this.account.accountAddress.toUint8Array()
      );
      console.log(hexAddress);
      console.log(`💰 Account balance: ${balance / 100000000} APT`);
      return balance;
    } catch (error) {
      console.warn("⚠️ Could not fetch account balance:", error.message);
      return 0;
    }
  }

  async getAccountBalance(accountAddress) {
    try {
      const balance = await this.aptos.getAccountAPTAmount({
        accountAddress: accountAddress,
      });
      return balance / 100000000; // Convert from Octas to APT
    } catch (error) {
      console.error("Failed to get account balance:", error);
      return 0;
    }
  }

  async transferTokens(toAddress, tokenType, amountInINR) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(
        `🔄 Starting transfer: ${amountInINR} INR worth of ${tokenType} to ${toAddress}`
      );

      // Calculate token amount based on conversion rates
      const conversionRates = {
        APT: 0.1, // 1 INR = 0.1 APT
        USDC: 0.012, // 1 INR = 0.012 USDC
      };

      const tokenAmount = amountInINR * conversionRates[tokenType];
      console.log(
        `📊 Converting ${amountInINR} INR to ${tokenAmount} ${tokenType}`
      );

      if (tokenType === "APT") {
        return await this.transferAPT(toAddress, tokenAmount);
      } else if (tokenType === "USDC") {
        return await this.transferUSDC(toAddress, tokenAmount);
      } else {
        throw new Error(`Unsupported token type: ${tokenType}`);
      }
    } catch (error) {
      console.error(`❌ Transfer failed:`, error);
      throw error;
    }
  }

  async transferAPT(toAddress, amount) {
    try {
      console.log(`💸 Transferring ${amount} APT to ${toAddress}`);

      // Convert to Octas (APT's smallest unit)
      const amountInOctas = Math.floor(amount * 100000000);

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if we can get ledger info (test network connectivity)
      const ledgerInfo = await this.aptos.getLedgerInfo();
      console.log(`📡 Connected to Aptos network. Ledger version: ${ledgerInfo.ledger_version}`);

      // Check our account balance
      const balance = await this.checkAccountBalance();
      console.log(`💰 Service account balance: ${balance / 100000000} APT`);

      // If we don't have enough balance, try to fund from faucet
      if (balance < amountInOctas) {
        console.log(`💧 Insufficient balance. Attempting to fund from faucet...`);
        try {
          await this.aptos.fundAccount({
            accountAddress: this.account.accountAddress,
            amount: Math.max(1000000000, amountInOctas * 2) // Fund with 10 APT or double the required amount
          });
          console.log(`✅ Account funded from faucet`);
          
          // Wait for funding to be processed
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Re-check balance
          const newBalance = await this.checkAccountBalance();
          console.log(`💰 Updated balance: ${newBalance / 100000000} APT`);
          
          if (newBalance < amountInOctas) {
            throw new Error(`Still insufficient balance after faucet funding. Required: ${amountInOctas}, Available: ${newBalance}`);
          }
        } catch (faucetError) {
          console.error(`❌ Faucet funding failed: ${faucetError.message}`);
          throw new Error(`Insufficient balance and faucet funding failed: ${faucetError.message}`);
        }
      }

      // Build the transaction
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [toAddress, amountInOctas],
        },
      });

      // Simulate the transaction first to check for errors
      const simulationResult = await this.aptos.transaction.simulate.simple({
        signerPublicKey: this.account.publicKey,
        transaction,
      });

      console.log(`🧪 Transaction simulation result:`, simulationResult[0]?.success ? 'SUCCESS' : 'FAILED');

      if (!simulationResult[0]?.success) {
        throw new Error(`Transaction simulation failed: ${simulationResult[0]?.vm_status || 'Unknown error'}`);
      }

      // Sign and submit the actual transaction
      console.log(`📝 Signing and submitting transaction...`);
      const pendingTransaction = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      console.log(`⏳ Transaction submitted: ${pendingTransaction.hash}`);

      // Wait for transaction confirmation
      const confirmedTransaction = await this.aptos.waitForTransaction({
        transactionHash: pendingTransaction.hash,
      });

      if (!confirmedTransaction.success) {
        throw new Error(`Transaction failed: ${confirmedTransaction.vm_status || 'Unknown error'}`);
      }

      console.log(`✅ APT transfer completed! Hash: ${confirmedTransaction.hash}`);

      return {
        hash: confirmedTransaction.hash,
        amount: amount,
        tokenType: "APT",
        recipient: toAddress,
        success: true,
        network: this.network,
        gasUsed: confirmedTransaction.gas_used,
        gasPrice: confirmedTransaction.gas_unit_price,
        sender: this.account.accountAddress.toString(),
        timestamp: new Date().toISOString(),
        simulated: false
      };

    } catch (error) {
      console.error("❌ APT transfer failed:", error);
      throw new Error(`Real APT transfer failed: ${error.message}`);
    }
  }

  async transferAPTDirect(fromAddress, toAddress, amount) {
    try {
      console.log(`💸 Direct APT transfer: ${amount} APT from ${fromAddress} to ${toAddress}`);

      // NOTE: For direct wallet-to-wallet transfers, we need the user's private key
      // In a production dApp, this would be handled by the frontend wallet (Petra, Martian, etc.)
      // through wallet adapter. Here we'll use our service account to demonstrate the flow.
      
      console.log("ℹ️ Using service account for demonstration of direct transfer flow");

      // Convert to Octas for validation
      const amountInOctas = Math.floor(amount * 100000000);

      // Validate minimum amount
      if (amountInOctas < 1000) { // 0.00001 APT minimum
        throw new Error('Amount too small. Minimum transfer is 0.00001 APT');
      }

      // Validate addresses are different
      if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
        throw new Error('Cannot send to the same address');
      }

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check network connectivity
      const ledgerInfo = await this.aptos.getLedgerInfo();
      console.log(`📡 Connected to Aptos network. Ledger version: ${ledgerInfo.ledger_version}`);

      // Check our service account balance (acting as the sender for demo)
      const balance = await this.checkAccountBalance();
      console.log(`💰 Service account balance: ${balance / 100000000} APT`);

      // If we don't have enough balance, try to fund from faucet
      if (balance < amountInOctas) {
        console.log(`💧 Funding service account from faucet...`);
        try {
          await this.aptos.fundAccount({
            accountAddress: this.account.accountAddress,
            amount: Math.max(1000000000, amountInOctas * 2)
          });
          console.log(`✅ Service account funded from faucet`);
          
          // Wait for funding
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (faucetError) {
          console.error(`❌ Faucet funding failed: ${faucetError.message}`);
          throw new Error(`Insufficient balance and faucet funding failed: ${faucetError.message}`);
        }
      }

      // Build the transaction using our service account (in production, user's wallet would sign)
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [toAddress, amountInOctas],
        },
      });

      // Simulate first
      const simulationResult = await this.aptos.transaction.simulate.simple({
        signerPublicKey: this.account.publicKey,
        transaction,
      });

      if (!simulationResult[0]?.success) {
        throw new Error(`Transaction simulation failed: ${simulationResult[0]?.vm_status || 'Unknown error'}`);
      }

      // Sign and submit the transaction
      console.log(`📝 Signing and submitting direct transfer...`);
      const pendingTransaction = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      console.log(`⏳ Direct transfer submitted: ${pendingTransaction.hash}`);

      // Wait for confirmation
      const confirmedTransaction = await this.aptos.waitForTransaction({
        transactionHash: pendingTransaction.hash,
      });

      if (!confirmedTransaction.success) {
        throw new Error(`Transaction failed: ${confirmedTransaction.vm_status || 'Unknown error'}`);
      }

      console.log(`✅ Direct APT transfer completed! Hash: ${confirmedTransaction.hash}`);

      return {
        hash: confirmedTransaction.hash,
        amount: amount,
        tokenType: "APT",
        sender: this.account.accountAddress.toString(), // Using service account as sender for demo
        recipient: toAddress,
        success: true,
        simulated: false,
        network: this.network,
        gasUsed: confirmedTransaction.gas_used,
        gasPrice: confirmedTransaction.gas_unit_price,
        timestamp: new Date().toISOString(),
        note: "Transaction completed using service account for demonstration. In production, user's connected wallet would sign the transaction."
      };

    } catch (error) {
      console.error("❌ Direct APT transfer failed:", error);
      throw new Error(`Direct APT transfer failed: ${error.message}`);
    }
  }

  async transferUSDC(toAddress, amount) {
    try {
      console.log(`💸 Transferring ${amount} USDC to ${toAddress}`);

      // For testnet USDC, we'll simulate the transfer since USDC contract might not be available
      console.log("ℹ️ USDC transfer is simulated for demo purposes");
      return await this.simulateTransfer(toAddress, amount, "USDC");
    } catch (error) {
      console.error("USDC transfer failed:", error);
      return await this.simulateTransfer(toAddress, amount, "USDC");
    }
  }

  async simulateTransfer(toAddress, amount, tokenType) {
    console.log(`🎭 Simulating ${tokenType} transfer for demo purposes`);

    // Generate a realistic mock transaction hash (64 characters)
    const mockHash =
      "0x" +
      Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");

    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 1000)
    );

    console.log(
      `✅ Simulated ${tokenType} transfer completed! Mock Hash: ${mockHash}`
    );

    return {
      hash: mockHash,
      amount: amount,
      tokenType: tokenType,
      recipient: toAddress,
      success: true,
      simulated: true,
      network: this.network,
      gasUsed: "2000",
      gasPrice: "100",
      sender: this.account?.accountAddress?.toString() || "0x1",
      timestamp: new Date().toISOString()
    };
  }

  async getTransactionDetails(transactionHash) {
    try {
      if (!this.isInitialized) {
        throw new Error("Aptos service not initialized");
      }

      const transaction = await this.aptos.getTransactionByHash({
        transactionHash: transactionHash,
      });

      return {
        hash: transaction.hash,
        success: transaction.success,
        timestamp: transaction.timestamp,
        sender: transaction.sender,
        gasUsed: transaction.gas_used,
        gasUnitPrice: transaction.gas_unit_price,
      };
    } catch (error) {
      console.error("Failed to get transaction details:", error);
      return null;
    }
  }

  getNetworkInfo() {
    return {
      network: this.network,
      accountAddress: this.account?.accountAddress?.toString() || null,
      isInitialized: this.isInitialized,
    };
  }
}

// Create and export service instance
const aptosService = new AptosService();

// Export both the instance and the transfer function for direct use
module.exports = {
  aptosService,
  transferTokens: (toAddress, tokenType, amountInINR) => {
    return aptosService.transferTokens(toAddress, tokenType, amountInINR);
  },
  transferAPTDirect: (fromAddress, toAddress, amount) => {
    return aptosService.transferAPTDirect(fromAddress, toAddress, amount);
  },
};
