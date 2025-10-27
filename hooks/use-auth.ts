import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(requireAuth: boolean = true) {
  const { user, isLoading, error } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user && requireAuth) {
      router.push('/api/auth/login?returnTo=' + window.location.pathname)
    }
  }, [user, isLoading, requireAuth, router])

  return {
    user,
    isLoading,
    error,
    userId: user?.sub || 'demo-user-id',
  }
}
