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
  // Disable subfolders for routing
  trailingSlash: true,
  // Enable static exports for the build process
  output: 'export',
};

module.exports = nextConfig; 