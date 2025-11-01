import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Bundle analyzer (optional, enabled via ANALYZE env var)
let withBundleAnalyzer = (config: NextConfig) => config
if (process.env.ANALYZE === 'true') {
  const bundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  withBundleAnalyzer = bundleAnalyzer
}

const nextConfig: NextConfig = {
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

  // Next.js 16: Turbopack est maintenant le bundler par défaut
  // Offre des builds jusqu'à 5x plus rapides en production

  // Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,

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

// Wrap with Sentry (only in production or when SENTRY_DSN is set)
const configWithSentry =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(withBundleAnalyzer(nextConfig), {
        // Sentry options
        silent: true,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        widenClientFileUpload: true,
        tunnelRoute: '/monitoring',
        disableLogger: true,
        automaticVercelMonitors: true,
      })
    : withBundleAnalyzer(nextConfig)

export default configWithSentry
