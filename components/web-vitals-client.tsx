'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/web-vitals'

/**
 * Client component to initialize Web Vitals tracking
 * Must be a client component to access window object
 */
export function WebVitalsClient() {
  useEffect(() => {
    initWebVitals()
  }, [])

  return null
}
