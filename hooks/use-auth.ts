import { useUser } from '@auth0/nextjs-auth0/client'
// import { useRouter } from 'next/navigation'
// import { useEffect } from 'react'

// TEMPORAIRE: Mode démo sans Auth0 pour débloquer le développement
// TODO: Réactiver Auth0 plus tard une fois les features principales terminées

export function useAuth(_requireAuth: boolean = true) {
  const { user, error } = useUser()
  // const isLoading = false
  // const router = useRouter()

  // TEMPORAIRE: Retourner un utilisateur de démo
  const demoUser = {
    sub: 'demo-user-id',
    email: 'demo@torp.fr',
    name: 'Utilisateur Démo',
  }

  return {
    user: user || demoUser,
    isLoading: false, // Toujours prêt en mode démo
    error,
    userId: user?.sub || 'demo-user-id',
  }
}
