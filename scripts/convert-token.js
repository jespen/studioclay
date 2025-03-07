// Script to convert a short-lived token to a long-lived token
const https = require('https');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to make HTTPS request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Error parsing response: ' + e.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('Error making request: ' + err.message));
    });
  });
}

// Main function
async function convertToken() {
  try {
    // Get input from user
    const appId = await new Promise(resolve => {
      rl.question('Enter your Facebook App ID: ', resolve);
    });
    
    const appSecret = await new Promise(resolve => {
      rl.question('Enter your Facebook App Secret: ', resolve);
    });
    
    const shortLivedToken = await new Promise(resolve => {
      rl.question('Enter your short-lived token: ', resolve);
    });
    
    // Make request to convert token
    console.log('\nConverting token...');
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const result = await makeRequest(url);
    
    if (result.access_token) {
      console.log('\n✅ Conversion successful!\n');
      console.log('Your long-lived token:');
      console.log(result.access_token);
      console.log('\nToken information:');
      console.log(`- Type: ${result.token_type || 'Bearer'}`);
      console.log(`- Expires in: ${result.expires_in || 'about 60 days'} seconds`);
      
      // Get token debugging information
      console.log('\nFetching token details...');
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${result.access_token}&access_token=${appId}|${appSecret}`;
      const debugInfo = await makeRequest(debugUrl);
      
      if (debugInfo.data) {
        const expireDate = new Date(debugInfo.data.expires_at * 1000).toLocaleString();
        console.log(`- Expires at: ${expireDate}`);
        console.log(`- App ID: ${debugInfo.data.app_id}`);
        console.log(`- User ID: ${debugInfo.data.user_id}`);
        
        const scopes = debugInfo.data.scopes || [];
        console.log(`- Permissions: ${scopes.join(', ')}`);
      }
      
      console.log('\n⚠️ IMPORTANT: Save this token securely and add it to your environment variables:');
      console.log('INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here');
    } else {
      console.error('❌ Error: No access token in response');
      console.error(result);
    }
  } catch (error) {
    console.error('❌ Error converting token:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
convertToken(); 