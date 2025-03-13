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
  assetPrefix: ''
};

module.exports = nextConfig; 