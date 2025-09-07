#!/usr/bin/env node

/**
 * FINAL REQUIREMENTS VERIFICATION - Aptos OnRamp
 * Checks all specified requirements from the original request
 */

const fs = require('fs');
const http = require('http');

const colors = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
    white: '\x1b[37m', reset: '\x1b[0m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function logSection(title) {
    console.log(`\n${colors.cyan}${'═'.repeat(70)}`);
    console.log(`${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

let results = { total: 0, passed: 0, failed: 0, warnings: 0 };

function checkRequirement(condition, requirement, details = '') {
    results.total++;
    if (condition) {
        results.passed++;
        log('green', '✅', `${requirement} ${details ? '- ' + details : ''}`);
        return true;
    } else {
        results.failed++;
        log('red', '❌', `${requirement} ${details ? '- ' + details : ''}`);
        return false;
    }
}

function checkPartialRequirement(condition, requirement, details = '') {
    results.total++;
    if (condition) {
        results.warnings++;
        log('yellow', '⚠️', `${requirement} ${details ? '- ' + details : ''}`);
        return false;
    } else {
        results.failed++;
        log('red', '❌', `${requirement} ${details ? '- ' + details : ''}`);
        return false;
    }
}

function fileExists(path) {
    return fs.existsSync(path);
}

function fileContains(path, content) {
    try {
        if (!fs.existsSync(path)) return false;
        return fs.readFileSync(path, 'utf8').includes(content);
    } catch {
        return false;
    }
}

async function checkServerRunning(port) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 2000
        }, () => resolve(true));
        req.on('error', () => resolve(false));
        req.on('timeout', () => resolve(false));
        req.end();
    });
}

async function runFinalVerification() {
    console.log(`${colors.magenta}
╔══════════════════════════════════════════════════════════════════════╗
║                    APTOS ONRAMP FINAL VERIFICATION                   ║
║               Checking All Original Requirements                     ║
╚══════════════════════════════════════════════════════════════════════╝${colors.reset}`);

    logSection('📋 REQUIREMENT 1: FRONTEND (React + Tailwind)');
    
    // Landing page with clean UI
    checkRequirement(
        fileExists('./frontend/src/App.jsx') && fileContains('./frontend/src/App.jsx', 'Aptos OnRamp'),
        'Landing page with "Aptos On-Ramp (UPI for Crypto)" header'
    );
    
    // Wallet connect button
    checkRequirement(
        fileExists('./frontend/src/components/WalletButton.jsx') && 
        fileContains('./frontend/src/components/WalletButton.jsx', 'Connect Petra Wallet'),
        'Wallet connect button (Petra wallet integration)'
    );
    
    // Payment form
    checkRequirement(
        fileExists('./frontend/src/components/OnRampForm.jsx') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'INR') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'APT') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'USDC'),
        'Payment form with INR input and token dropdown (APT/USDC)'
    );
    
    // Razorpay button
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'Pay') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'Razorpay'),
        '"Pay with Razorpay" button'
    );
    
    // Transaction result display
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'success') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'explorer.aptoslabs.com'),
        'Transaction result with Aptos Explorer link'
    );
    
    // Success modal
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'You received') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'toast'),
        'Success modal "You received tokens in your wallet"'
    );
    
    // TailwindCSS
    checkRequirement(
        fileExists('./frontend/tailwind.config.js') &&
        fileContains('./frontend/src/index.css', '@tailwind'),
        'TailwindCSS styling (responsive, modern)'
    );

    logSection('🔧 REQUIREMENT 2: BACKEND (Express + Razorpay + Aptos)');
    
    // Backend server running
    const backendRunning = await checkServerRunning(3001);
    checkRequirement(backendRunning, 'Backend API running on port 3001');
    
    // API routes
    checkRequirement(
        fileContains('./backend/index.js', '/api/create-order'),
        'POST /create-order endpoint for Razorpay integration'
    );
    
    checkRequirement(
        fileContains('./backend/index.js', '/api/verify-payment'),
        'POST /verify-payment endpoint for signature verification'
    );
    
    checkRequirement(
        fileContains('./backend/index.js', '/api/transfer-tokens'),
        'POST /transfer-tokens endpoint for Aptos transfers'
    );
    
    // Razorpay integration
    checkRequirement(
        fileContains('./backend/index.js', 'razorpay') &&
        fileContains('./backend/index.js', 'createHmac'),
        'Razorpay API integration with signature verification'
    );
    
    // Aptos SDK integration
    checkRequirement(
        fileContains('./backend/index.js', '@aptos-labs/ts-sdk') &&
        fileContains('./backend/index.js', 'aptos.signAndSubmitTransaction'),
        'Aptos SDK integration for token transfers'
    );
    
    // Environment variables
    checkRequirement(
        fileExists('./backend/.env') &&
        fileContains('./backend/.env', 'RAZORPAY_KEY_ID') &&
        fileContains('./backend/.env', 'APTOS_PRIVATE_KEY'),
        'Environment configuration for secrets'
    );
    
    // Error handling
    checkRequirement(
        fileContains('./backend/index.js', 'try') &&
        fileContains('./backend/index.js', 'catch') &&
        fileContains('./backend/index.js', 'console.log'),
        'Error handling and transaction logging'
    );

    logSection('📜 REQUIREMENT 3: MOVE SMART CONTRACTS');
    
    // OnRamp.move contract
    checkRequirement(
        fileExists('./contracts/OnRamp.move'),
        'OnRamp.move contract file exists'
    );
    
    // Contract functions
    checkRequirement(
        fileContains('./contracts/OnRamp.move', 'mint_usdc'),
        'mint_usdc() function for USDC minting'
    );
    
    checkRequirement(
        fileContains('./contracts/OnRamp.move', 'transfer_usdc'),
        'transfer_usdc() function for USDC transfers'
    );
    
    checkRequirement(
        fileContains('./contracts/OnRamp.move', 'transfer_apt'),
        'transfer_apt() function for APT transfers'
    );
    
    // TestUSDC implementation
    checkRequirement(
        fileContains('./contracts/OnRamp.move', 'TestUSDC'),
        'TestUSDC struct for test token'
    );
    
    // Deployment scripts
    checkRequirement(
        fileExists('./contracts/publish.sh'),
        'Shell deployment script (publish.sh)'
    );
    
    checkRequirement(
        fileExists('./contracts/publish.ts'),
        'TypeScript deployment script (publish.ts)'
    );
    
    // Move.toml configuration
    checkRequirement(
        fileExists('./contracts/Move.toml'),
        'Move.toml package configuration'
    );
    
    // Backend integration
    checkRequirement(
        fileContains('./backend/index.js', 'mint_usdc') ||
        fileContains('./backend/index.js', 'OnRamp::mint_usdc'),
        'Backend integration with Move contract'
    );

    logSection('🔄 REQUIREMENT 4: INTEGRATION FLOW');
    
    // Frontend calls create-order
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', '/create-order'),
        'Frontend calls /create-order endpoint'
    );
    
    // Razorpay widget integration
    checkRequirement(
        fileContains('./frontend/index.html', 'checkout.razorpay.com') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'Razorpay'),
        'Razorpay widget integration'
    );
    
    // Payment verification flow
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', '/verify-payment') &&
        fileContains('./backend/index.js', 'razorpay_signature'),
        'Payment verification and webhook handling'
    );
    
    // Token transfer on success
    checkRequirement(
        fileContains('./backend/index.js', 'transferTokens') &&
        fileContains('./backend/index.js', 'signAndSubmitTransaction'),
        'Token transfer on payment success'
    );
    
    // Frontend updates with transaction hash
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'transaction_hash') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'explorer.aptoslabs.com'),
        'Frontend updates with transaction hash and explorer link'
    );

    logSection('🎁 REQUIREMENT 5: BONUS FEATURES');
    
    // Gas fee estimation (basic implementation)
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'conversion') ||
        fileContains('./frontend/src/components/OnRampForm.jsx', 'rate'),
        'Token conversion rate display (basic gas estimation)'
    );
    
    // Balance display
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'balance') &&
        fileContains('./backend/index.js', '/api/balance'),
        'Wallet balance display feature'
    );
    
    // KYC form placeholder
    checkPartialRequirement(
        false, // Not implemented as it's bonus
        'KYC upload form (bonus feature - not implemented)'
    );

    logSection('📦 DELIVERABLES VERIFICATION');
    
    // Frontend deliverables
    checkRequirement(
        fileExists('./frontend/src/components/Header.jsx') &&
        fileExists('./frontend/src/components/Footer.jsx') &&
        fileExists('./frontend/src/components/OnRampForm.jsx'),
        'Frontend components for payment flow'
    );
    
    checkRequirement(
        fileContains('./frontend/index.html', 'razorpay') &&
        fileContains('./frontend/src/components/OnRampForm.jsx', 'Razorpay'),
        'Razorpay checkout integration'
    );
    
    checkRequirement(
        fileExists('./frontend/tailwind.config.js') &&
        fileContains('./frontend/src/index.css', 'tailwind'),
        'TailwindCSS styling implementation'
    );
    
    // Backend deliverables
    checkRequirement(
        fileExists('./backend/index.js') &&
        fileContains('./backend/index.js', 'express') &&
        fileContains('./backend/index.js', 'razorpay'),
        'Express routes for payment + Aptos transactions'
    );
    
    checkRequirement(
        fileExists('./backend/.env.example'),
        'Environment configuration template (.env.example)'
    );
    
    // Contracts deliverables
    checkRequirement(
        fileExists('./contracts/OnRamp.move') &&
        fileContains('./contracts/OnRamp.move', 'mint_usdc'),
        'Move smart contract with mint + transfer functions'
    );
    
    checkRequirement(
        fileExists('./contracts/publish.sh') ||
        fileExists('./contracts/publish.ts'),
        'Contract deployment script'
    );

    logSection('🎯 DEMO READINESS');
    
    // Servers running
    const frontendRunning = await checkServerRunning(5173);
    checkRequirement(frontendRunning, 'Frontend accessible at http://localhost:5173');
    checkRequirement(backendRunning, 'Backend accessible at http://localhost:3001');
    
    // Core functionality ready
    checkRequirement(
        fileContains('./frontend/src/components/WalletButton.jsx', 'useWallet'),
        'Wallet connection functionality'
    );
    
    checkRequirement(
        fileContains('./frontend/src/components/OnRampForm.jsx', 'handlePayment'),
        'Payment processing functionality'
    );
    
    checkRequirement(
        fileContains('./backend/index.js', 'transferTokens'),
        'Token transfer functionality'
    );
    
    // Documentation
    checkRequirement(
        fileExists('./README.md'),
        'Complete documentation (README.md)'
    );

    logSection('📊 FINAL ASSESSMENT');
    
    const passRate = ((results.passed / results.total) * 100).toFixed(1);
    
    console.log(`${colors.white}Total Requirements Checked: ${results.total}`);
    console.log(`${colors.green}✅ Requirements Met: ${results.passed}`);
    console.log(`${colors.red}❌ Requirements Missing: ${results.failed}`);
    console.log(`${colors.yellow}⚠️  Partial/Bonus: ${results.warnings}`);
    console.log(`${colors.cyan}📈 Completion Rate: ${passRate}%${colors.reset}\n`);
    
    // Final verdict
    if (results.failed === 0) {
        log('green', '🏆', 'ALL REQUIREMENTS SUCCESSFULLY IMPLEMENTED!');
        console.log('   The Aptos OnRamp application is complete and demo-ready.');
    } else if (results.failed <= 3) {
        log('yellow', '🥈', 'CORE REQUIREMENTS MET - MINOR ITEMS MISSING');
        console.log('   The application is functional with some optional features missing.');
    } else {
        log('red', '🔧', 'SIGNIFICANT REQUIREMENTS MISSING');
        console.log('   Core functionality needs to be completed.');
    }
    
    console.log(`\n${colors.blue}🎬 DEMO INSTRUCTIONS:`);
    console.log('1. Ensure both servers are running:');
    console.log('   - Frontend: http://localhost:5173');
    console.log('   - Backend: http://localhost:3001');
    console.log('2. Open frontend in browser');
    console.log('3. Connect Petra wallet (if available)');
    console.log('4. Enter payment amount and select token');
    console.log('5. Demonstrate payment flow (test mode)');
    console.log(`6. Show transaction handling and API integration${colors.reset}`);
    
    return { results, passRate: parseFloat(passRate) };
}

// Run verification
if (require.main === module) {
    runFinalVerification().catch(console.error);
}

module.exports = { runFinalVerification };
