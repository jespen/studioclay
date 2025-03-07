// Script to test Instagram Basic Display API access
const https = require('https');
const fs = require('fs');
const path = require('path');

// Get token from .env.local file
let accessToken;
try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/INSTAGRAM_ACCESS_TOKEN=([^\r\n]+)/);
  accessToken = tokenMatch ? tokenMatch[1] : null;
} catch (err) {
  console.error('Error reading .env.local file:', err.message);
  process.exit(1);
}

if (!accessToken) {
  console.error('No Instagram access token found in .env.local file');
  process.exit(1);
}

console.log(`Found access token, length: ${accessToken.length}`);
console.log('Testing Basic Display API access...');

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
          resolve({ statusCode: res.statusCode, data: data });
        } catch (e) {
          reject(new Error(`Error parsing response: ${e.message}, data: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error making request: ${err.message}`));
    });
  });
}

// Main function to test various API endpoints
async function testInstagramAccess() {
  try {
    // 1. Test user endpoint
    console.log('\n1. Testing Instagram /me endpoint...');
    const userUrl = `https://graph.instagram.com/me?access_token=${accessToken}`;
    console.log(`Request URL: ${userUrl}`);
    
    const userResponse = await makeRequest(userUrl);
    console.log(`Status code: ${userResponse.statusCode}`);
    console.log(`Response: ${userResponse.data}`);
    
    // 2. Test user media endpoint
    console.log('\n2. Testing Instagram /me/media endpoint...');
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=${accessToken}`;
    console.log(`Request URL: ${mediaUrl}`);
    
    const mediaResponse = await makeRequest(mediaUrl);
    console.log(`Status code: ${mediaResponse.statusCode}`);
    console.log(`Response: ${mediaResponse.data}`);
    
    // 3. Test token information
    console.log('\n3. Testing token debug information...');
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    console.log(`Request URL: ${debugUrl}`);
    
    const debugResponse = await makeRequest(debugUrl);
    console.log(`Status code: ${debugResponse.statusCode}`);
    console.log(`Response: ${debugResponse.data}`);
    
  } catch (error) {
    console.error('\n❌ Error testing Instagram access:', error.message);
    process.exit(1);
  }
}

// Run the test
testInstagramAccess(); 