/**
 * Consolidated Instagram Tools
 * 
 * This script combines multiple Instagram token management functions into one utility:
 * - Convert short-lived token to long-lived token
 * - Refresh an existing long-lived token
 * - Check Instagram API access
 * - Show token details
 * 
 * Usage:
 *   node scripts/instagram-tools.js convert <short_lived_token>
 *   node scripts/instagram-tools.js refresh
 *   node scripts/instagram-tools.js check
 *   node scripts/instagram-tools.js details
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  // Instagram App credentials
  app_id: process.env.INSTAGRAM_APP_ID || '',
  app_secret: process.env.INSTAGRAM_APP_SECRET || '',
  redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || 'https://studioclay.se',
  
  // File paths
  envFile: path.join(process.cwd(), '.env.local'),
  
  // API Endpoints
  apiBaseUrl: 'https://graph.instagram.com',
};

// Helper function to make HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          resolve(responseData);
        } catch (e) {
          resolve(data); // Return as string if not JSON
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Get access token from .env.local file
function getAccessToken() {
  try {
    const envContent = fs.readFileSync(CONFIG.envFile, 'utf8');
    const tokenMatch = envContent.match(/INSTAGRAM_ACCESS_TOKEN=([^\r\n]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  } catch (err) {
    console.error('Error reading .env.local file:', err.message);
    return null;
  }
}

// Save a new access token to .env.local
function saveAccessToken(token) {
  try {
    let envContent = '';
    
    // Read existing file if it exists
    if (fs.existsSync(CONFIG.envFile)) {
      envContent = fs.readFileSync(CONFIG.envFile, 'utf8');
      
      // Replace existing token if found
      if (envContent.includes('INSTAGRAM_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /INSTAGRAM_ACCESS_TOKEN=([^\r\n]+)/,
          `INSTAGRAM_ACCESS_TOKEN=${token}`
        );
      } else {
        // Add to the end if not found
        envContent += `\nINSTAGRAM_ACCESS_TOKEN=${token}`;
      }
    } else {
      // Create new file with token
      envContent = `INSTAGRAM_ACCESS_TOKEN=${token}`;
    }
    
    // Write back to file
    fs.writeFileSync(CONFIG.envFile, envContent);
    return true;
  } catch (err) {
    console.error('Error saving access token:', err.message);
    return false;
  }
}

// Function to convert a short-lived token to a long-lived token
async function convertToken(shortLivedToken) {
  try {
    console.log('Converting short-lived token to long-lived token...');
    
    // Load app credentials from environment if not in CONFIG
    if (!CONFIG.app_id || !CONFIG.app_secret) {
      const envContent = fs.readFileSync(CONFIG.envFile, 'utf8');
      const appIdMatch = envContent.match(/INSTAGRAM_APP_ID=([^\r\n]+)/);
      const appSecretMatch = envContent.match(/INSTAGRAM_APP_SECRET=([^\r\n]+)/);
      
      CONFIG.app_id = appIdMatch ? appIdMatch[1] : '';
      CONFIG.app_secret = appSecretMatch ? appSecretMatch[1] : '';
      
      if (!CONFIG.app_id || !CONFIG.app_secret) {
        console.error('Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET in .env.local');
        return false;
      }
    }
    
    // Exchange the short-lived token for a long-lived token
    const exchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${CONFIG.app_secret}&access_token=${shortLivedToken}`;
    
    const response = await makeRequest(exchangeUrl);
    
    if (response.access_token) {
      console.log('✅ Successfully converted to long-lived token!');
      console.log(`New token expires in approximately ${Math.round(response.expires_in / 60 / 60 / 24)} days`);
      
      // Save the new token
      if (saveAccessToken(response.access_token)) {
        console.log('✅ Token saved to .env.local file');
      }
      
      return response.access_token;
    } else {
      console.error('❌ Failed to convert token:', response.error ? response.error.message : 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error converting token:', error.message);
    return null;
  }
}

// Function to refresh an existing long-lived token
async function refreshToken() {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.error('❌ No Instagram access token found in .env.local file');
      return null;
    }
    
    console.log('Refreshing long-lived Instagram token...');
    
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`;
    const response = await makeRequest(refreshUrl);
    
    if (response.access_token) {
      console.log('✅ Successfully refreshed token!');
      console.log(`New token expires in approximately ${Math.round(response.expires_in / 60 / 60 / 24)} days`);
      
      // Save the new token
      if (saveAccessToken(response.access_token)) {
        console.log('✅ Token saved to .env.local file');
      }
      
      return response.access_token;
    } else {
      console.error('❌ Failed to refresh token:', response.error ? response.error.message : 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    return null;
  }
}

// Function to check Instagram API access
async function checkAccess() {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.error('❌ No Instagram access token found in .env.local file');
      return false;
    }
    
    console.log('=== CHECKING INSTAGRAM API ACCESS ===');
    
    // First get user info
    console.log('Requesting user information...');
    const userInfoUrl = `${CONFIG.apiBaseUrl}/me?fields=id,username,account_type&access_token=${accessToken}`;
    const userInfo = await makeRequest(userInfoUrl);
    
    if (userInfo.error) {
      console.error('❌ Error accessing user info:', userInfo.error.message);
      console.log('Your token may have expired. Try refreshing it with: node scripts/instagram-tools.js refresh');
      return false;
    }
    
    console.log('✅ Successfully accessed Instagram API!');
    console.log(`User ID: ${userInfo.id}`);
    console.log(`Username: ${userInfo.username || 'Not available'}`);
    console.log(`Account Type: ${userInfo.account_type || 'Not available'}`);
    
    // Now try to get media
    console.log('\nRequesting user media...');
    const mediaUrl = `${CONFIG.apiBaseUrl}/me/media?fields=id,caption&limit=5&access_token=${accessToken}`;
    const mediaInfo = await makeRequest(mediaUrl);
    
    if (mediaInfo.error) {
      console.error('❌ Error accessing media:', mediaInfo.error.message);
      return false;
    }
    
    console.log('✅ Successfully retrieved media!');
    console.log(`Media count: ${mediaInfo.data ? mediaInfo.data.length : 0}`);
    
    if (mediaInfo.data && mediaInfo.data.length > 0) {
      console.log('\nFirst few media items:');
      mediaInfo.data.slice(0, 3).forEach(item => {
        console.log(`- ID: ${item.id}, Caption: ${item.caption ? (item.caption.substring(0, 50) + '...') : 'No caption'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking access:', error.message);
    return false;
  }
}

// Function to show token details
async function showTokenDetails() {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.error('❌ No Instagram access token found in .env.local file');
      return false;
    }
    
    console.log('=== INSTAGRAM TOKEN DETAILS ===');
    console.log('Token from .env.local:');
    console.log(`${accessToken.substring(0, 15)}...${accessToken.substring(accessToken.length - 10)}`);
    console.log(`Token length: ${accessToken.length} characters`);
    
    // Check token debug info
    console.log('\nChecking token validity...');
    const debugUrl = `${CONFIG.apiBaseUrl}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugInfo = await makeRequest(debugUrl);
    
    if (debugInfo.error) {
      console.error('❌ Error getting token debug info:', debugInfo.error.message);
      return false;
    }
    
    if (debugInfo.data) {
      console.log('✅ Token information:');
      console.log(`- App ID: ${debugInfo.data.app_id || 'Not available'}`);
      console.log(`- Type: ${debugInfo.data.type || 'Not available'}`);
      console.log(`- Application: ${debugInfo.data.application || 'Not available'}`);
      
      if (debugInfo.data.expires_at) {
        const expiresAt = new Date(debugInfo.data.expires_at * 1000);
        const daysUntilExpiry = Math.round((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
        
        console.log(`- Expires: ${expiresAt.toISOString().split('T')[0]} (in ${daysUntilExpiry} days)`);
      } else {
        console.log('- Expiration: Not available');
      }
      
      console.log(`- Valid: ${debugInfo.data.is_valid ? 'Yes' : 'No'}`);
      
      if (debugInfo.data.scopes) {
        console.log('- Scopes:');
        debugInfo.data.scopes.forEach(scope => console.log(`  * ${scope}`));
      }
    } else {
      console.log('⚠️ No debug data available for this token');
    }
    
    // Try to get user info
    console.log('\nTrying to access user information...');
    const userInfoUrl = `${CONFIG.apiBaseUrl}/me?fields=id,username,account_type&access_token=${accessToken}`;
    const userInfo = await makeRequest(userInfoUrl);
    
    if (userInfo.error) {
      console.error('❌ Error accessing user info:', userInfo.error.message);
    } else {
      console.log('✅ Token is valid and can access user data:');
      console.log(`- User ID: ${userInfo.id}`);
      console.log(`- Username: ${userInfo.username || 'Not available'}`);
      console.log(`- Account Type: ${userInfo.account_type || 'Not available'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error showing token details:', error.message);
    return false;
  }
}

// Main function to parse command line arguments and run appropriate function
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log(`
Instagram Tools - Usage:
  node scripts/instagram-tools.js convert <short_lived_token>  - Convert short-lived token to long-lived token
  node scripts/instagram-tools.js refresh                      - Refresh an existing long-lived token
  node scripts/instagram-tools.js check                        - Check Instagram API access
  node scripts/instagram-tools.js details                      - Show token details
`);
    return;
  }
  
  switch (command) {
    case 'convert':
      const shortLivedToken = process.argv[3];
      if (!shortLivedToken) {
        console.error('❌ Error: Short-lived token is required');
        console.log('Usage: node scripts/instagram-tools.js convert <short_lived_token>');
        return;
      }
      await convertToken(shortLivedToken);
      break;
      
    case 'refresh':
      await refreshToken();
      break;
      
    case 'check':
      await checkAccess();
      break;
      
    case 'details':
      await showTokenDetails();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run without arguments to see usage information');
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 