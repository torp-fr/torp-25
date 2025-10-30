import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable ESLint during builds on CI to avoid plugin resolution issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },

  // Experimental features (Next.js 15 compatible)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for Prisma in serverless
    if (isServer) {
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      })
    }
    return config
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
