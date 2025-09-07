#!/usr/bin/env node

/**
 * Quick Status Check for Aptos OnRamp Application
 */

const http = require('http');

function checkServer(port, name) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 3000
        }, (res) => {
            console.log(`✅ ${name} is running on port ${port}`);
            resolve(true);
        });

        req.on('error', () => {
            console.log(`❌ ${name} is NOT running on port ${port}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`⏰ ${name} timeout on port ${port}`);
            resolve(false);
        });

        req.end();
    });
}

async function checkStatus() {
    console.log('🔍 Checking Aptos OnRamp Application Status...\n');
    
    const backendRunning = await checkServer(3001, 'Backend Server');
    const frontendRunning = await checkServer(5173, 'Frontend Server');
    
    console.log('\n📊 Status Summary:');
    
    if (backendRunning && frontendRunning) {
        console.log('🚀 READY FOR DEMO! Both servers are running.');
        console.log('🌐 Frontend: http://localhost:5173');
        console.log('🔧 Backend: http://localhost:3001');
    } else if (backendRunning || frontendRunning) {
        console.log('⚠️  PARTIAL: One server is running, one is not.');
        if (!backendRunning) console.log('   Start backend: cd backend && npm run dev');
        if (!frontendRunning) console.log('   Start frontend: cd frontend && npm run dev');
    } else {
        console.log('🔴 NOT READY: Both servers are down.');
        console.log('   Start backend: cd backend && npm run dev');
        console.log('   Start frontend: cd frontend && npm run dev');
    }
}

checkStatus().catch(console.error);
