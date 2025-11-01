'use client'

import { useEffect } from 'react'

export function WebVitalsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Lazy load Web Vitals to avoid blocking initial render
    import('@/lib/web-vitals').catch(() => {
      // Silently fail if Web Vitals can't be loaded
    })
  }, [])

  return <>{children}</>
}
