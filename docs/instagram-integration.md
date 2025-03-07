# Instagram Integration for Studio Clay

This document explains how to set up the Instagram API integration to automatically display posts from your Instagram account in the Portfolio section.

## Prerequisites

1. A Facebook Developer account
2. A Facebook Page connected to your Instagram Business or Creator account
3. An Instagram Business or Creator account

## Setup Steps

### 1. Create a Facebook App

1. Go to [Facebook for Developers](https://developers.facebook.com/) and sign in with your Facebook account
2. Click on "My Apps" and then "Create App"
3. Select "Business" as the app type
4. Fill in the app name (e.g., "Studio Clay Website") and your business email
5. Click "Create App"

### 2. Add Instagram Graph API to Your App

1. From your app dashboard, click "Add Products" in the left sidebar
2. Find "Instagram Graph API" and click "Set Up"
3. Follow the prompts to add the Instagram Graph API to your app

### 3. Configure Basic Settings

1. Navigate to "Settings" > "Basic" in your app dashboard
2. Note down your App ID and App Secret for later use
3. Add your website's domain to the "App Domains" section
4. Save changes

### 4. Create an Access Token

1. Go to "Tools" > "Graph API Explorer"
2. Select your app from the dropdown menu at the top
3. Click on "Get Token" > "Page Access Token"
4. Select your Facebook Page that's connected to your Instagram account
5. In the permissions dialog, make sure to include:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
6. Click "Generate Token"
7. Convert this short-lived token to a long-lived token using the [Access Token Tool](https://developers.facebook.com/tools/debug/accesstoken/)

### 5. Update Environment Variables

1. Open the `.env.local` file in your project root
2. Update the `INSTAGRAM_ACCESS_TOKEN` with your long-lived access token:

```
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token_here
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. For production, make sure to add these variables to your hosting environment

### 6. Test the Integration

1. Restart your development server
2. Visit the Portfolio section of your website
3. You should see your Instagram posts loading automatically
4. If you post new content to Instagram, it will appear on your website within an hour (due to caching)

## Troubleshooting

- **No posts appear**: Check your access token in the environment variables and ensure your Instagram account has public posts
- **Error in API**: Check the browser console for specific error messages
- **Only fallback images appear**: Ensure your Instagram Business account is properly connected to your Facebook Page

## Security Considerations

- Never commit your access token to version control
- Consider using a token rotation strategy for production environments
- For high-traffic sites, implement a server-side caching strategy to avoid rate limits

## Additional Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugging Tool](https://developers.facebook.com/tools/debug/accesstoken/) 