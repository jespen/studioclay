/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Set this to true to allow server-only components
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'studioclay.se',
      },
      {
        protocol: 'https',
        hostname: 'www.studioclay.se',
      },
      {
        protocol: 'https',
        hostname: 'xaptrspjxqzgtddsqzwo.supabase.co',
      },
    ],
    domains: ['xaptrspjxqzgtddsqzwo.supabase.co'],
  },
  output: 'standalone',
  // Disable static generation attempts for API routes in production
  // This helps with Vercel deployment issues
  env: {
    NEXT_DISABLE_STATIC_OPTIMIZATION: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig; 