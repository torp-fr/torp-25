import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776',

  // Release tracking pour intégration GitHub
  release:
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: process.env.NODE_ENV === 'development',

  environment: process.env.NODE_ENV || process.env.VERCEL_ENV || 'development',

  // Enable Spotlight in development (requires Sentry DevTools extension)
  spotlight: process.env.NODE_ENV === 'development',

  // Custom tags
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV || 'development',
      platform: 'nextjs',
      version: process.env.npm_package_version || '1.0.0',
    },
  },

  // Configure which integrations to use
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Set sample rate for session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
