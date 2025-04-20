OLDDDDD och igen

# Instagram Integration Setup

This guide explains how to set up Instagram integration for Studio Clay's website.

## Prerequisites

1. An Instagram Business or Creator account
2. A Facebook Developer account (used to create an app that connects to Instagram)

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Log in with your Facebook account
3. Click "My Apps" and then "Create App"
4. Choose "Business" as the app type
5. Enter details for your app (name, contact email, etc.)
6. Complete app creation

## Step 2: Configure Instagram Basic Display

1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Under "Basic Display", configure:
   - Valid OAuth Redirect URIs (e.g., `https://studioclay.se`)
   - Deauthorize Callback URL
   - Data Deletion Request URL
4. Save your changes

## Step 3: Configure App Settings

1. Go to "App Settings" > "Basic"
2. Note down your "App ID" and "App Secret" - you'll need these later
3. Make sure your app's privacy policy URL is set
4. If needed, add additional app admins

## Step 4: Create Access Token

1. Under "Instagram Basic Display" > "Basic Display", click "Generate Token"
2. Log in with your Instagram account
3. Authorize your app
4. Copy the short-lived access token that is generated

## Step 5: Convert to Long-lived Token

The short-lived token expires in 1 hour. You need to convert it to a long-lived token (valid for 60 days).

Use our Instagram tools script to convert your token:

```bash
# Replace YOUR_SHORT_LIVED_TOKEN with the token from step 4
node scripts/instagram-tools.js convert YOUR_SHORT_LIVED_TOKEN
```

This will:
1. Convert your short-lived token to a long-lived token
2. Save the token to your `.env.local` file

## Step 6: Verify Token and Setup

Verify your token works correctly:

```bash
# Check your Instagram API access
npm run instagram:check
```

## Step 7: Schedule Token Refresh

The long-lived token expires after 60 days. You should refresh it at least once every 30-45 days.

### Option 1: Manual Refresh

Run this command to manually refresh your token:

```bash
npm run instagram:refresh
```

### Option 2: Automated Refresh (Recommended)

Set up a scheduled task or cron job to automatically refresh your token:

```bash
# Example cron job (runs every 30 days)
0 0 */30 * * cd /path/to/studioclay && npm run instagram:refresh
```

## Troubleshooting

If you encounter issues, use these commands to diagnose:

```bash
# Check token details
npm run instagram:details

# Check API access
npm run instagram:check
```

Common issues:
- Invalid token: The token might be expired or invalid
- Insufficient permissions: The token doesn't have the required scopes
- Rate limiting: Too many requests to the Instagram API

## How it Works

The Instagram integration:
1. Fetches photos from your Instagram account
2. Displays them on the website
3. Updates automatically when you post new content

## Maintenance

To keep the integration working:
1. Refresh the token regularly
2. Monitor for any error messages in the website logs
3. Check for any Instagram API changes that might affect the integration 