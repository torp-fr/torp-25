import { useUser } from '@auth0/nextjs-auth0/client'

export function useAuth(_requireAuth: boolean = true) {
  const { user, error, isLoading } = useUser()

  return {
    user: user || null,
    userId: user?.sub || null,
    isLoading,
    error,
  }
}
