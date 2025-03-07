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
    console.log('Attempting to connect to Instagram API...');
    
    // Try a different approach - fetching user's own media directly
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
    console.log(`Checking token information:`, tokenDebugUrl);
    
    try {
      const tokenResponse = await fetch(tokenDebugUrl);
      const tokenData = await tokenResponse.json();
      console.log('Token debug info:', JSON.stringify(tokenData, null, 2));
    } catch (tokenError) {
      console.error('Error debugging token:', tokenError);
    }
    
    // If above approach fails, try the Graph API
    // First, get the user's Instagram Business Account ID
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
      console.log('No Facebook Pages found. Make sure to link a Facebook Page to your account.');
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
  // Get the token from environment variables
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('Instagram access token not configured');
    // Return mock data if no token is configured
    return NextResponse.json({ posts: mockInstagramPosts });
  }
  
  console.log('Instagram access token found, length:', accessToken.length);
  
  try {
    const instagramPosts = await fetchInstagramPosts(accessToken);
    console.log(`Returning ${instagramPosts.length} Instagram posts`);
    return NextResponse.json({ posts: instagramPosts });
  } catch (error: any) {
    console.error('Error in Instagram API route:', error);
    // Return mock data on error
    return NextResponse.json({ posts: mockInstagramPosts });
  }
} 