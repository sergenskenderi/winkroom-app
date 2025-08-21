#!/usr/bin/env node

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return null;
}

const ip = getLocalIPAddress();

if (ip) {
  console.log('\n🌐 Your current IP address is:', ip);
  console.log('📝 Update your Config.ts with:');
  console.log(`   API_BASE_URL: 'http://${ip}:5400/api'`);
  console.log('\n💡 Quick copy-paste:');
  console.log(`   API_BASE_URL: 'http://${ip}:5400/api',`);
  console.log('\n');
} else {
  console.log('❌ Could not find your IP address');
  console.log('💡 Try checking your network settings manually');
} 