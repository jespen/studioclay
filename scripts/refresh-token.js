// Script to refresh Instagram access token
const https = require('https');
const fs = require('fs');
const path = require('path');

// Get existing token and app credentials from .env.local file
let accessToken, appId, appSecret;
try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const tokenMatch = envContent.match(/INSTAGRAM_ACCESS_TOKEN=([^\r\n]+)/);
  const appIdMatch = envContent.match(/FACEBOOK_APP_ID=([^\r\n]+)/);
  const appSecretMatch = envContent.match(/FACEBOOK_APP_SECRET=([^\r\n]+)/);
  
  accessToken = tokenMatch ? tokenMatch[1] : null;
  appId = appIdMatch ? appIdMatch[1] : null;
  appSecret = appSecretMatch ? appSecretMatch[1] : null;
} catch (err) {
  console.error('Error reading .env.local file:', err.message);
  process.exit(1);
}

// Check if we have all required parameters
if (!accessToken) {
  console.error('No Instagram access token found in .env.local file');
  process.exit(1);
}

if (!appId || !appSecret) {
  console.error('Facebook App ID or App Secret not found in .env.local file');
  console.log('Please add the following to your .env.local file:');
  console.log('FACEBOOK_APP_ID=your_app_id');
  console.log('FACEBOOK_APP_SECRET=your_app_secret');
  process.exit(1);
}

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          reject(new Error(`Error parsing response: ${e.message}, data: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error making request: ${err.message}`));
    });
  });
}

// Function to update the .env.local file with the new token
function updateEnvFile(oldToken, newToken) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace old token with new token
    envContent = envContent.replace(
      `INSTAGRAM_ACCESS_TOKEN=${oldToken}`,
      `INSTAGRAM_ACCESS_TOKEN=${newToken}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('Successfully updated .env.local file with new token');
  } catch (err) {
    console.error('Error updating .env.local file:', err.message);
    process.exit(1);
  }
}

// Main function to refresh the token
async function refreshToken() {
  console.log('Starting token refresh process...');
  
  try {
    // Check token info first
    console.log('\nChecking current token info...');
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const debugInfo = await makeRequest(debugUrl);
    
    if (debugInfo.statusCode !== 200) {
      console.error('Error checking token info:', debugInfo.data.error?.message || 'Unknown error');
      process.exit(1);
    }
    
    if (debugInfo.data.data) {
      const expiresAt = debugInfo.data.data.expires_at;
      const expiresDate = new Date(expiresAt * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt * 1000 - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Current token expires on: ${expiresDate.toLocaleString()}`);
      console.log(`Days until expiry: ${daysUntilExpiry}`);
      
      // Only refresh if less than 15 days until expiry
      if (daysUntilExpiry > 15) {
        console.log('\nToken still has more than 15 days until expiry. No need to refresh now.');
        console.log(`Run this script again after ${daysUntilExpiry - 15} days.`);
        process.exit(0);
      }
    }
    
    // Refresh the token
    console.log('\nRefreshing token...');
    const refreshUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
    
    const refreshResult = await makeRequest(refreshUrl);
    
    if (refreshResult.statusCode !== 200 || !refreshResult.data.access_token) {
      console.error('Error refreshing token:', refreshResult.data.error?.message || 'Unknown error');
      process.exit(1);
    }
    
    const newToken = refreshResult.data.access_token;
    console.log('\n✅ Token refresh successful!');
    console.log(`New token: ${newToken.substring(0, 10)}...${newToken.substring(newToken.length - 10)}`);
    
    // Get info about the new token
    const newDebugUrl = `https://graph.facebook.com/debug_token?input_token=${newToken}&access_token=${appId}|${appSecret}`;
    const newDebugInfo = await makeRequest(newDebugUrl);
    
    if (newDebugInfo.statusCode === 200 && newDebugInfo.data.data) {
      const newExpiresAt = newDebugInfo.data.data.expires_at;
      const newExpiresDate = new Date(newExpiresAt * 1000);
      console.log(`New token expires on: ${newExpiresDate.toLocaleString()}`);
    }
    
    // Update the .env.local file with the new token
    updateEnvFile(accessToken, newToken);
    
    console.log('\n🎉 Process completed successfully!');
    console.log('Remember to restart your server to pick up the new token.');
  } catch (error) {
    console.error('\n❌ Error refreshing token:', error.message);
    process.exit(1);
  }
}

// Run the script
refreshToken(); 