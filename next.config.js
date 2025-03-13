/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
    // Only unoptimize images for static exports
    unoptimized: process.env.VERCEL !== 'true' && process.env.NODE_ENV !== 'development',
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  // Conditionally apply static export settings
  ...(process.env.VERCEL === 'true'
    ? {
        // Vercel-specific settings
        trailingSlash: true,
      }
    : process.env.NODE_ENV === 'development'
      ? {
          // Development settings (no static export)
          trailingSlash: true,
        }
      : {
          // Production settings for non-Vercel environments (static export)
          output: 'export',
          trailingSlash: true,
          basePath: '',
          assetPrefix: '',
          // Disable middleware in static export mode
          skipMiddlewareUrlNormalize: true,
        }
  ),
  // Ensure we don't show waitlist-confirmation as index
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig; 