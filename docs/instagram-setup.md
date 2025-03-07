# Instagram Integration for Studio Clay

## Current Status

The Instagram integration is currently using mock data because the Instagram token provided doesn't have access to any Facebook Pages. For the Instagram Graph API to work properly, you need to have:

1. An Instagram Business or Creator account (not a personal account)
2. A Facebook Page linked to your Instagram account
3. A Facebook Developer App with the Instagram Graph API enabled
4. A long-lived access token with the proper permissions

## How to Set Up a Proper Instagram Integration

### 1. Convert Your Instagram Account to a Business/Creator Account

1. Open the Instagram app
2. Go to your profile
3. Tap the menu (hamburger icon) in the top-right corner
4. Go to Settings > Account
5. Scroll down and tap "Switch to Professional Account"
6. Choose "Business" or "Creator" based on your needs
7. Follow the prompts to complete the setup

### 2. Link Your Instagram Account to a Facebook Page

1. In the Instagram app, go to your profile
2. Tap "Edit Profile"
3. Tap "Page" under "Public Business Information"
4. Either create a new Facebook Page or select an existing one
5. Follow the prompts to complete the connection

### 3. Create a Facebook Developer App

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click "My Apps" > "Create App"
3. Select "Business" as the app type
4. Fill in the app name (e.g., "Studio Clay Website")
5. Click "Create App"
6. In your app dashboard, add the "Instagram Graph API" product

### 4. Generate a Long-Lived Access Token

#### Option 1: Using Graph API Explorer

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the dropdown
3. Click "Get Token" > "Page Access Token"
4. Select your Facebook Page
5. Make sure to select these permissions:
   - `instagram_basic`
   - `instagram_content_publish` (if you want to post to Instagram)
   - `pages_show_list`
   - `pages_read_engagement`
6. Click "Generate Token"
7. Convert this short-lived token to a long-lived token using the Access Token Debugging Tool:
   - Go to [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
   - Use the Graph API to exchange the token: 
     ```
     /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}
     ```

#### Option 2: Using Our Script

You can use the script we created to simplify the process:

```bash
node scripts/convert-token.js
```

### 5. Update Your Environment Variables

Once you have a long-lived token:

1. Open the `.env.local` file
2. Update the `INSTAGRAM_ACCESS_TOKEN` value with your new token
3. Add your Facebook App ID and App Secret for token refresh:
   ```
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```
4. Restart the development server

### 6. Test the Integration

Use our test script to verify your token works correctly:

```bash
node scripts/test-instagram-token.js
```

If the test is successful, you should see your Instagram posts displayed in the Portfolio section of your website.

## Token Refresh

Instagram access tokens expire after approximately 60 days. To prevent disruption to your Instagram feed, we've provided a script to refresh your token before it expires:

```bash
node scripts/refresh-token.js
```

You should run this script approximately every 45 days to ensure your token stays valid. The script will:

1. Check the current token's expiration date
2. Only refresh the token if it's within 15 days of expiring
3. Update the token in your `.env.local` file automatically
4. Display the new expiration date

Consider setting up a recurring calendar reminder or automated task to run this script.

## Troubleshooting

If you're experiencing issues:

1. **No Facebook Pages Found:** Make sure your Instagram account is properly linked to a Facebook Page
2. **No Instagram Business Account Found:** Ensure your Instagram account is set to Business or Creator
3. **Token Issues:** Tokens expire after about 60 days, so you'll need to refresh it periodically
4. **API Errors:** Check the console for detailed error messages

For assistance, please refer to the [Instagram Graph API documentation](https://developers.facebook.com/docs/instagram-api/).

## Long-Term Solution

The current mock implementation ensures your website looks good with sample pottery images. For a production environment, complete the steps above to connect to your actual Instagram account.

You could also consider using a service like [Curator.io](https://curator.io/) or [EmbedSocial](https://embedsocial.com/) that can simplify Instagram integration for your website. 