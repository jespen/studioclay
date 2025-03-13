/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
    // Only unoptimize images for static exports
    unoptimized: process.env.VERCEL !== 'true',
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
    : {
        // Settings for non-Vercel environments (static export)
        output: 'export',
        trailingSlash: true,
        basePath: '',
        assetPrefix: '',
      }
  ),
  // Ensure we don't show waitlist-confirmation as index
  skipTrailingSlashRedirect: true,
  // Generate all static pages
  generateStaticParams: async () => {
    return {
      '/': { page: '/' },
      '/admin': { page: '/admin' },
      '/admin/dashboard': { page: '/admin/dashboard' },
      '/waitlist-confirmation': { page: '/waitlist-confirmation' }
    }
  }
};

module.exports = nextConfig; 