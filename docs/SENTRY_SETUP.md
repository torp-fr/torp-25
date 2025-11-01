# 🛡️ Configuration Sentry

Sentry est maintenant installé et configuré pour le monitoring d'erreurs et les performances.

## ⚙️ Variables d'Environnement Requises

Ajoutez ces variables dans Vercel (ou votre fichier `.env.local` pour le dev):

```env
# Sentry DSN (obtenu depuis sentry.io)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Optionnel - pour source maps upload automatique
SENTRY_ORG=torp
SENTRY_PROJECT=torp-platform
SENTRY_AUTH_TOKEN=xxx
```

## 🚀 Démarrage Rapide

1. **Créer un compte Sentry**: https://sentry.io/signup/
2. **Créer un projet Next.js** dans Sentry
3. **Copier le DSN** et l'ajouter aux variables d'environnement
4. **Optionnel**: Configurer l'upload de source maps pour un meilleur debugging

## 📊 Fonctionnalités Actives

- ✅ **Error Tracking**: Capture automatique des erreurs
- ✅ **Performance Monitoring**: Traces des requêtes API
- ✅ **Session Replay**: Enregistrement des sessions (10% en prod, 100% sur erreurs)
- ✅ **Web Vitals**: Métriques de performance intégrées

## 🔧 Configuration

### Personnaliser les Options

Éditez `sentry.client.config.ts` pour:

- Ajuster `tracesSampleRate` (0.0 à 1.0)
- Modifier `replaysSessionSampleRate`
- Ajouter des tags personnalisés
- Configurer des filtres d'erreurs

### Désactiver en Développement

```typescript
// sentry.client.config.ts
Sentry.init({
  enabled: process.env.NODE_ENV === 'production',
  // ...
})
```

## 📚 Documentation

- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)
