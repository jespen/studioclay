/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
    unoptimized: true,
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  // Enable trailing slashes for consistent routing
  trailingSlash: true,
  // Enable static exports for the build process
  output: 'export',
  // Disable basePath and assetPrefix for Vercel deployment
  basePath: '',
  assetPrefix: '',
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