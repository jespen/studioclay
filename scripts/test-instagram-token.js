// Script to test Instagram access token
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
console.log('Testing token validity...');

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

// Main function to test the token
async function testInstagramToken() {
  console.log('\n1. Testing Facebook Pages API...');
  try {
    const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
    console.log(`Request URL: ${accountsUrl}`);
    
    const accountsResponse = await makeRequest(accountsUrl);
    
    if (accountsResponse.statusCode !== 200) {
      console.error('❌ Facebook Pages API returned non-200 status:', accountsResponse.statusCode);
      console.error('Response:', JSON.stringify(accountsResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Facebook Pages API response successful');
    
    if (!accountsResponse.data.data || accountsResponse.data.data.length === 0) {
      console.error('❌ No Facebook Pages found for this account');
      console.error('Response:', JSON.stringify(accountsResponse.data, null, 2));
      process.exit(1);
    }
    
    const pageId = accountsResponse.data.data[0].id;
    const pageName = accountsResponse.data.data[0].name;
    console.log(`Found Facebook Page: ${pageName} (ID: ${pageId})`);
    
    // Get Instagram Business Account
    console.log('\n2. Testing Instagram Business Account connection...');
    const instagramAccountUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
    console.log(`Request URL: ${instagramAccountUrl}`);
    
    const instagramAccountResponse = await makeRequest(instagramAccountUrl);
    
    if (instagramAccountResponse.statusCode !== 200) {
      console.error('❌ Instagram Business Account API returned non-200 status:', instagramAccountResponse.statusCode);
      console.error('Response:', JSON.stringify(instagramAccountResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Instagram Business Account API response successful');
    
    if (!instagramAccountResponse.data.instagram_business_account) {
      console.error('❌ No Instagram Business Account found for this Facebook Page');
      console.error('Response:', JSON.stringify(instagramAccountResponse.data, null, 2));
      process.exit(1);
    }
    
    const instagramAccountId = instagramAccountResponse.data.instagram_business_account.id;
    console.log(`Found Instagram Business Account ID: ${instagramAccountId}`);
    
    // Get Instagram Media
    console.log('\n3. Testing Instagram Media API...');
    const mediaUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&limit=5&access_token=${accessToken}`;
    console.log(`Request URL: ${mediaUrl}`);
    
    const mediaResponse = await makeRequest(mediaUrl);
    
    if (mediaResponse.statusCode !== 200) {
      console.error('❌ Instagram Media API returned non-200 status:', mediaResponse.statusCode);
      console.error('Response:', JSON.stringify(mediaResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Instagram Media API response successful');
    
    const posts = mediaResponse.data.data || [];
    console.log(`Retrieved ${posts.length} Instagram posts`);
    
    if (posts.length > 0) {
      console.log('\nSample post:');
      const sample = posts[0];
      console.log(`- ID: ${sample.id}`);
      console.log(`- Type: ${sample.media_type}`);
      console.log(`- Caption: ${sample.caption ? sample.caption.substring(0, 50) + '...' : 'No caption'}`);
      console.log(`- URL: ${sample.permalink}`);
      console.log(`- Date: ${new Date(sample.timestamp).toLocaleString()}`);
    }
    
    console.log('\n✅ All tests passed! Your Instagram token is working correctly.');
  } catch (error) {
    console.error('\n❌ Error testing Instagram token:', error.message);
    process.exit(1);
  }
}

// Run the test
testInstagramToken(); 