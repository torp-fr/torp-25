// Auth0 désactivé - Mode démo
export function useAuth(_requireAuth: boolean = true) {
  const demoUser = {
    sub: 'demo-user-id',
    email: 'demo@torp.fr',
    name: 'Utilisateur Démo',
  }

  return {
    user: demoUser,
    isLoading: false,
    error: null,
    userId: 'demo-user-id',
  }
}
