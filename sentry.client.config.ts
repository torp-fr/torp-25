import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: process.env.NODE_ENV === 'development',

  environment: process.env.NODE_ENV || 'development',

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
