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

  environment: process.env.NODE_ENV || process.env.VERCEL_ENV || 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
