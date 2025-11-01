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

// Wrap with Sentry (always enabled with GitHub integration)
const hasSentryDsn =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776'

const configWithSentry = hasSentryDsn
  ? withSentryConfig(withBundleAnalyzer(nextConfig), {
      // Sentry options
      silent: true,
      org: process.env.SENTRY_ORG || 'o4510290746146816',
      project: process.env.SENTRY_PROJECT || 'torp-platform',
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : withBundleAnalyzer(nextConfig)

export default configWithSentry
