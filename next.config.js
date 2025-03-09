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
  // Comment out static export configuration for admin authentication functionality
  // output: 'export',
  // Disable default basePath
  basePath: '',
  // Make sure assets have proper paths
  assetPrefix: '',
  // Disable subfolders for routing
  trailingSlash: true,
};

module.exports = nextConfig; 