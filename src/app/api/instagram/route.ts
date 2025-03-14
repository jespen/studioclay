import { NextResponse } from 'next/server';
import { cache } from 'react';

// Cache the Instagram data for 1 hour
const CACHE_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
let cachedData: any = null;
let lastFetchTime = 0;

// Mock Instagram data as fallback
const mockInstagramPosts = [
  {
    id: '1',
    caption: 'Beautiful handcrafted ceramic bowls - perfect for your dining table. Each piece is unique and made with love. #pottery #ceramics #handmade #tableware',
    media_type: 'IMAGE',
    media_url: '/gallery/ceramic-bowls.svg',
    permalink: 'https://www.instagram.com/p/mock-post-1/',
    thumbnail_url: null,
    timestamp: new Date().toISOString(),
    username: 'studioclay',
  },
  {
    id: '2',
    caption: 'Workshop vibes! Teaching a group of enthusiastic students the art of pottery. #workshop #teaching #pottery #clayart',
    media_type: 'IMAGE',
    media_url: '/gallery/pottery-workshop.svg',
    permalink: 'https://www.instagram.com/p/mock-post-2/',
    thumbnail_url: null,
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    username: 'studioclay',
  },
  {
    id: '3',
    caption: 'The process of glazing - adding color and life to these clay sculptures. #process #glazing #pottery #art',
    media_type: 'IMAGE',
    media_url: '/gallery/clay-sculptures.svg',
    permalink: 'https://www.instagram.com/p/mock-post-3/',
    thumbnail_url: null,
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    username: 'studioclay',
  },
  {
    id: '4',
    caption: 'Studio space update - new shelves installed for our growing collection. #studio #organization #pottery',
    media_type: 'IMAGE',
    media_url: '/gallery/glazed-mugs.svg',
    permalink: 'https://www.instagram.com/p/mock-post-4/',
    thumbnail_url: null,
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    username: 'studioclay',
  },
  {
    id: '5',
    caption: 'Just finished these artistic clay sculptures - exploring organic forms and textures. #art #sculpture #clay #artistic',
    media_type: 'IMAGE',
    media_url: '/gallery/hand-sculpting.svg',
    permalink: 'https://www.instagram.com/p/mock-post-5/',
    thumbnail_url: null,
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    username: 'studioclay',
  },
  {
    id: '6',
    caption: 'Decorative pieces for the home - adding a touch of handmade beauty to your spaces. #decor #homedecor #pottery #ceramics',
    media_type: 'IMAGE',
    media_url: '/gallery/clay-vases.svg',
    permalink: 'https://www.instagram.com/p/mock-post-6/',
    thumbnail_url: null,
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    username: 'studioclay',
  }
];

// Create a reusable fetch function with caching
const fetchInstagramPosts = cache(async (accessToken: string) => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (cachedData && now - lastFetchTime < CACHE_TIME) {
    console.log('Returning cached Instagram data');
    return cachedData;
  }
  
  try {
    console.log('Attempting to get user information first...');
    try {
      const userInfoUrl = `https://graph.instagram.com/me?fields=id,username,name,account_type&access_token=${accessToken}`;
      console.log('Requesting user info from:', userInfoUrl);
      
      const userResponse = await fetch(userInfoUrl);
      const userText = await userResponse.text();
      
      try {
        // Try to parse the response as JSON
        const userData = JSON.parse(userText);
        console.log('User info response:', JSON.stringify(userData, null, 2));
      } catch (e) {
        // If it's not valid JSON, just log the text
        console.log('User info response (not JSON):', userText);
      }
    } catch (userError) {
      console.error('Error fetching user info:', userError);
    }

    console.log('Now trying to fetch media...');
    const userMediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=${accessToken}`;
    console.log('Requesting user media from:', userMediaUrl);
    
    const mediaResponse = await fetch(userMediaUrl);
    
    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error('Instagram API error:', errorText);
      throw new Error(`Failed to fetch user media: ${mediaResponse.statusText}`);
    }
    
    const mediaData = await mediaResponse.json();
    console.log('Instagram API response:', JSON.stringify(mediaData, null, 2));
    
    if (mediaData.data && mediaData.data.length > 0) {
      // Update cache with real data
      cachedData = mediaData.data;
      lastFetchTime = now;
      return mediaData.data;
    } 
    
    console.log('No media found in direct approach, trying Graph API approach...');
    
    // Debug token information
    const tokenDebugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    console.log(`\n=== TOKEN DEBUG INFORMATION ===`);
    console.log(`Checking token information:`, tokenDebugUrl);
    
    try {
      const tokenResponse = await fetch(tokenDebugUrl);
      const tokenData = await tokenResponse.json();
      console.log('Token debug info:', JSON.stringify(tokenData, null, 2));
      
      if (tokenData.data) {
        console.log(`\n=== USER INFORMATION ===`);
        console.log(`User ID: ${tokenData.data.user_id}`);
        console.log(`App ID: ${tokenData.data.app_id}`);
        console.log(`Permissions: ${tokenData.data.scopes?.join(', ') || 'None'}`);
        console.log(`Token expires: ${new Date(tokenData.data.expires_at * 1000).toLocaleString()}`);
        
        // Get user information
        console.log(`\n=== FETCHING USER DETAILS ===`);
        const userUrl = `https://graph.facebook.com/v18.0/${tokenData.data.user_id}?fields=id,name,email&access_token=${accessToken}`;
        console.log(`User details URL: ${userUrl}`);
        
        try {
          const userResponse = await fetch(userUrl);
          const userData = await userResponse.json();
          console.log('User details:', JSON.stringify(userData, null, 2));
        } catch (userError) {
          console.error('Error fetching user details:', userError);
        }
      }
    } catch (tokenError) {
      console.error('Error debugging token:', tokenError);
    }
    
    // Check Facebook pages
    console.log(`\n=== FACEBOOK PAGES CHECK ===`);
    const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
    console.log(`Fetching Facebook Pages:`, accountsUrl);
    
    const accountsResponse = await fetch(accountsUrl);
    
    if (!accountsResponse.ok) {
      const accountsErrorText = await accountsResponse.text();
      console.error('Facebook Pages API error:', accountsErrorText);
      throw new Error(`Failed to fetch Facebook Pages: ${accountsResponse.statusText}`);
    }
    
    const accountsData = await accountsResponse.json();
    console.log('Facebook Pages response:', JSON.stringify(accountsData, null, 2));
    
    if (!accountsData.data || accountsData.data.length === 0) {
      console.log('\n=== NO FACEBOOK PAGES FOUND ===');
      console.log('No Facebook Pages found. Make sure to link a Facebook Page to your account.');
      
      // Try to check Instagram business accounts directly
      console.log('\n=== TRYING ALTERNATIVE INSTAGRAM APPROACH ===');
      
      try {
        // Check if this is a personal Instagram access token
        console.log('Checking if this is a personal Instagram token...');
        const igUserUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`;
        console.log(`Instagram user URL: ${igUserUrl}`);
        
        const igUserResponse = await fetch(igUserUrl);
        
        if (igUserResponse.ok) {
          const igUserData = await igUserResponse.json();
          console.log('Instagram user details:', JSON.stringify(igUserData, null, 2));
          
          if (igUserData.id) {
            console.log(`Found Instagram user ID: ${igUserData.id}`);
            console.log(`Username: ${igUserData.username || 'Not available'}`);
            console.log(`Account type: ${igUserData.account_type || 'Not available'}`);
            
            // Try to get media via Instagram Graph API directly
            const mediaUrl = `https://graph.instagram.com/${igUserData.id}/media?access_token=${accessToken}`;
            console.log(`Trying direct media URL: ${mediaUrl}`);
            
            const mediaResponse = await fetch(mediaUrl);
            const mediaData = await mediaResponse.json();
            console.log('Direct media response:', JSON.stringify(mediaData, null, 2));
          }
        } else {
          const errorText = await igUserResponse.text();
          console.log('Instagram user check failed:', errorText);
        }
      } catch (igError) {
        console.error('Error in alternative Instagram approach:', igError);
      }
      
      console.log('Falling back to mock data');
      return mockInstagramPosts;
    }
    
    const pageId = accountsData.data[0].id;
    console.log(`Found Facebook Page ID: ${pageId}`);
    
    // Get the Instagram Business Account ID connected to the Facebook Page
    const instagramAccountUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
    console.log(`Fetching Instagram Business Account:`, instagramAccountUrl);
    
    const instagramAccountResponse = await fetch(instagramAccountUrl);
    
    if (!instagramAccountResponse.ok) {
      const instagramAccountErrorText = await instagramAccountResponse.text();
      console.error('Instagram Business Account API error:', instagramAccountErrorText);
      throw new Error(`Failed to fetch Instagram Business Account: ${instagramAccountResponse.statusText}`);
    }
    
    const instagramAccountData = await instagramAccountResponse.json();
    console.log('Instagram Business Account response:', JSON.stringify(instagramAccountData, null, 2));
    
    if (!instagramAccountData.instagram_business_account) {
      throw new Error('No Instagram Business Account found');
    }
    
    const instagramAccountId = instagramAccountData.instagram_business_account.id;
    console.log(`Found Instagram Business Account ID: ${instagramAccountId}`);
    
    // Now get the media from the Instagram Business Account
    const graphMediaUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&limit=20&access_token=${accessToken}`;
    console.log(`Fetching Instagram media:`, graphMediaUrl);

    const graphMediaResponse = await fetch(graphMediaUrl);

    if (!graphMediaResponse.ok) {
      const mediaErrorText = await graphMediaResponse.text();
      console.error('Instagram Media API error:', mediaErrorText);
      throw new Error(`Failed to fetch Instagram media: ${graphMediaResponse.statusText}`);
    }

    const graphMediaData = await graphMediaResponse.json();
    console.log(`Retrieved ${graphMediaData.data?.length || 0} Instagram posts`);

    // Update cache
    cachedData = graphMediaData.data;
    lastFetchTime = now;

    return graphMediaData.data;
  } catch (error) {
    console.error('Instagram API Error:', error);
    // If there's an error, return mock data as fallback
    console.log('Falling back to mock data');
    return mockInstagramPosts;
  }
});

export async function GET() {
  return NextResponse.json({ data: mockInstagramPosts });
}