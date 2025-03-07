import { NextResponse } from 'next/server';
import { cache } from 'react';

// Cache the Instagram data for 1 hour
const CACHE_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
let cachedData: any = null;
let lastFetchTime = 0;

// Create a reusable fetch function with caching
const fetchInstagramPosts = cache(async (accessToken: string) => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (cachedData && now - lastFetchTime < CACHE_TIME) {
    return cachedData;
  }
  
  try {
    // First, get the user's Instagram Business Account ID
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch Facebook Pages');
    }
    
    const accountsData = await accountsResponse.json();
    if (!accountsData.data || accountsData.data.length === 0) {
      throw new Error('No Facebook Pages found');
    }
    
    const pageId = accountsData.data[0].id;
    
    // Get the Instagram Business Account ID connected to the Facebook Page
    const instagramAccountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    
    if (!instagramAccountResponse.ok) {
      throw new Error('Failed to fetch Instagram Business Account');
    }
    
    const instagramAccountData = await instagramAccountResponse.json();
    if (!instagramAccountData.instagram_business_account) {
      throw new Error('No Instagram Business Account found');
    }
    
    const instagramAccountId = instagramAccountData.instagram_business_account.id;
    
    // Now get the media from the Instagram Business Account
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&limit=20&access_token=${accessToken}`
    );
    
    if (!mediaResponse.ok) {
      throw new Error('Failed to fetch Instagram media');
    }
    
    const mediaData = await mediaResponse.json();
    
    // Update cache
    cachedData = mediaData.data;
    lastFetchTime = now;
    
    return mediaData.data;
  } catch (error) {
    console.error('Instagram API Error:', error);
    // If there's an error, return empty array and don't update cache
    return [];
  }
});

export async function GET() {
  // In a real implementation, you would retrieve this from environment variables
  // This is a placeholder and won't work without a real token
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Instagram access token not configured' },
      { status: 500 }
    );
  }
  
  try {
    const instagramPosts = await fetchInstagramPosts(accessToken);
    return NextResponse.json({ posts: instagramPosts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Instagram posts' },
      { status: 500 }
    );
  }
} 