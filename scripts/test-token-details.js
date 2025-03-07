// Script to show detailed information about the Instagram token
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
          if (data.includes("Sorry, this content isn't available")) {
            resolve({ statusCode: res.statusCode, data: { error: "Sorry, this content isn't available right now" } });
          } else {
            reject(new Error(`Error parsing response: ${e.message}, data: ${data}`));
          }
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error making request: ${err.message}`));
    });
  });
}

async function testTokenDetails() {
  console.log('\n=== TOKEN DEBUG INFORMATION ===');
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
  console.log(`Checking token information:`, debugUrl);
  
  try {
    const debugResult = await makeRequest(debugUrl);
    console.log('Token debug info:', JSON.stringify(debugResult.data, null, 2));
    
    if (debugResult.data.data) {
      const tokenData = debugResult.data.data;
      console.log(`\n=== USER INFORMATION ===`);
      console.log(`User ID: ${tokenData.user_id}`);
      console.log(`App ID: ${tokenData.app_id}`);
      console.log(`Permissions: ${tokenData.scopes?.join(', ') || 'None'}`);
      console.log(`Token expires: ${new Date(tokenData.expires_at * 1000).toLocaleString()}`);
      
      console.log(`\n=== FACEBOOK USER DETAILS ===`);
      const fbUserUrl = `https://graph.facebook.com/v18.0/${tokenData.user_id}?fields=id,name,email&access_token=${accessToken}`;
      console.log(`Facebook user URL: ${fbUserUrl}`);
      
      const fbUserResult = await makeRequest(fbUserUrl);
      console.log('Facebook user details:', JSON.stringify(fbUserResult.data, null, 2));
      
      console.log(`\n=== FACEBOOK PAGES ===`);
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
      console.log(`Facebook Pages URL: ${pagesUrl}`);
      
      const pagesResult = await makeRequest(pagesUrl);
      console.log('Facebook Pages:', JSON.stringify(pagesResult.data, null, 2));
      
      if (pagesResult.data.data && pagesResult.data.data.length > 0) {
        const page = pagesResult.data.data[0];
        console.log(`\nFound Facebook Page: ${page.name} (ID: ${page.id})`);
        
        // Check Instagram Business Account
        const igAccountUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`;
        console.log(`\n=== INSTAGRAM BUSINESS ACCOUNT ===`);
        console.log(`Instagram Business Account URL: ${igAccountUrl}`);
        
        const igAccountResult = await makeRequest(igAccountUrl);
        console.log('Instagram Business Account:', JSON.stringify(igAccountResult.data, null, 2));
      } else {
        console.log('\nNo Facebook Pages found for this user');
        
        // Try direct Instagram access
        console.log(`\n=== TRYING DIRECT INSTAGRAM ACCESS ===`);
        const igUserUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`;
        console.log(`Instagram User URL: ${igUserUrl}`);
        
        const igUserResult = await makeRequest(igUserUrl);
        console.log('Instagram User Details:', JSON.stringify(igUserResult.data, null, 2));
        
        if (igUserResult.data.id) {
          const igMediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=${accessToken}`;
          console.log(`\nInstagram Media URL: ${igMediaUrl}`);
          
          const igMediaResult = await makeRequest(igMediaUrl);
          console.log('Instagram Media:', JSON.stringify(igMediaResult.data, null, 2));
        }
      }
    }
  } catch (error) {
    console.error('Error testing token details:', error.message);
  }
}

// Run the test
testTokenDetails(); 