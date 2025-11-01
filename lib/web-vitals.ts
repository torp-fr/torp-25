import { onCLS, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'

/**
 * Report Web Vitals metrics
 * Can be extended to send to analytics services (Sentry, Google Analytics, etc.)
 */
export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating)
  }

  // TODO: Send to analytics service in production
  // Example: Send to Sentry
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.metrics.distribution(metric.name, metric.value, {
  //     tags: {
  //       rating: metric.rating,
  //     },
  //   })
  // }
}

/**
 * Initialize Web Vitals tracking
 * Call this in app/layout.tsx or _app.tsx
 * Note: FID is deprecated, INP is the new metric but requires user interaction
 * We track: CLS, LCP, FCP, TTFB
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return

  onCLS(reportWebVitals)
  onLCP(reportWebVitals)
  onFCP(reportWebVitals)
  onTTFB(reportWebVitals)
}
