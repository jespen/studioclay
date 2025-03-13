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
  // Disable default basePath
  basePath: '',
  // Make sure assets have proper paths
  assetPrefix: '',
  // Enable trailing slashes for consistent routing
  trailingSlash: true,
  // Enable static exports for the build process
  output: 'export',
  // Configure static paths
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      '/contact': { page: '/contact' },
      '/admin': { page: '/admin' },
      '/admin/dashboard': { page: '/admin/dashboard' }
    }
  }
};

module.exports = nextConfig; 