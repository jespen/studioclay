# Studio Clay FTP Deployment Guide

This guide explains how to deploy the Studio Clay website directly to GoDaddy using FTP, bypassing the problematic Git deployment process.

## Why FTP Deployment?

GoDaddy's Git deployment tends to create a nested directory structure (home/repositories/studioclay) that causes issues with proper website functionality. By using FTP deployment, we can ensure files are placed directly at the root level where they need to be.

## Prerequisites

1. GoDaddy FTP credentials:
   - FTP Host (usually `ftp.yourdomain.com`)
   - FTP Username
   - FTP Password
   - FTP Port (usually 21)

2. Node.js packages (automatically installed when you run the deployment):
   - `ftp` package
   - `ftp-deploy` package

## Deployment Options

### Option 1: Simple Deployment (Recommended)

This option uses the `ftp-deploy` package, which is more robust and easier to use.

```bash
# Install the dependencies
npm install

# Build and deploy the site
npm run simple-deploy
```

You'll be prompted to enter your FTP credentials:
- FTP Host (e.g., `ftp.studioclay.com`)
- FTP Username
- FTP Password
- Remote directory (usually `/public_html`)
- Whether to delete existing files on the server

### Option 2: Advanced Deployment

This option uses a custom deployment script with more detailed output.

```bash
# Install the dependencies
npm install

# Build and deploy the site
npm run deploy
```

You'll be prompted to enter your FTP credentials as with the simple deployment.

## What the Deployment Does

1. Builds the Next.js site with `npm run build` (which includes the flattening script)
2. Verifies the output directory exists
3. Connects to your GoDaddy FTP server
4. Uploads all files to the specified directory (usually `/public_html`)
5. Sets up proper file permissions and directory structure

## Troubleshooting

### Common Issues

1. **Connection Refused**: Verify your FTP credentials and that your host allows FTP connections.
2. **Timeout Error**: Your internet connection may be slow, or the server might be busy.
3. **Permission Denied**: Make sure your FTP user has permission to write to the destination directory.

### Help and Support

If you encounter issues, check the error message in the terminal output.

For further assistance, contact your website developer or GoDaddy support. 