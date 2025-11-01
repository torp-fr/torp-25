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

  // Next.js 16: Features optimisées
  experimental: {
    // Server Actions toujours supportés
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,

  // Next.js 16: Turbopack par défaut (plus besoin de config webpack pour Prisma)
  // Le support de Prisma est natif avec Turbopack

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
