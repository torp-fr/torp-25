// MODE DÉMO - Auth0 complètement désactivé
// TODO: Réactiver Auth0 plus tard une fois les features principales terminées

export function useAuth(_requireAuth: boolean = true) {
  // Utilisateur de démo par défaut
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
