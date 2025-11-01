# 🔧 Configuration Sentry - Error Tracking

**Date**: 1er Novembre 2025  
**Status**: Prêt à configurer

---

## 📋 Prérequis

1. Un compte [Sentry](https://sentry.io) (gratuit jusqu'à 5K événements/mois)
2. Un projet Next.js créé sur Sentry

---

## 🚀 Étapes de Configuration

### 1. Créer un Projet Sentry

1. Aller sur [sentry.io](https://sentry.io) et se connecter
2. Créer un nouveau projet :
   - **Platform**: Next.js
   - **Project Name**: `torp-platform` (ou nom de votre choix)
3. Sentry générera automatiquement un **DSN** (Data Source Name)

### 2. Configurer les Variables d'Environnement

Ajouter dans `.env.local` (ou variables Vercel pour production) :

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=votre-org-slug
SENTRY_PROJECT=votre-project-slug

# Optionnel - Auth Token pour upload de source maps
SENTRY_AUTH_TOKEN=votre-auth-token
```

#### Comment obtenir les valeurs :

**DSN** :

- Visible sur la page de configuration du projet Sentry
- Format: `https://[key]@[org].ingest.sentry.io/[project]`

**ORG** :

- Visible dans l'URL de votre organisation Sentry
- Ex: `https://sentry.io/organizations/[ORG]/`

**PROJECT** :

- Le nom du projet (slug)
- Visible dans l'URL du projet

**AUTH_TOKEN** (optionnel) :

- Settings → Auth Tokens → Create New Token
- Scopes nécessaires: `project:releases`, `org:read`

### 3. Vérifier la Configuration

Les fichiers suivants sont déjà configurés :

- ✅ `sentry.client.config.ts` - Configuration client
- ✅ `sentry.server.config.ts` - Configuration serveur
- ✅ `sentry.edge.config.ts` - Configuration edge
- ✅ `.instrumentation.ts` - Instrumentation Next.js
- ✅ `next.config.ts` - Wrapper Sentry

### 4. Tester la Configuration

```typescript
// Dans n'importe quelle page ou API route
throw new Error('Test Sentry Error')
```

Vous devriez voir l'erreur apparaître dans le dashboard Sentry.

---

## 📊 Fonctionnalités Activées

### Error Tracking

- ✅ Erreurs JavaScript automatiquement capturées
- ✅ Erreurs serveur (API routes)
- ✅ Erreurs edge (middleware)
- ✅ Source maps automatiques en production

### Performance Monitoring

- ✅ Transaction tracking automatique
- ✅ Performance traces pour les pages
- ✅ Temps de réponse API

### Session Replay

- ✅ Replay des sessions avec erreurs (100%)
- ✅ Replay des sessions normales (10%)
- ✅ Masquage automatique des données sensibles

### Vercel Integration

- ✅ Vercel Cron Monitors tracking
- ✅ Déploiements automatiques trackés

---

## 🔍 Vérification de la Configuration

### 1. Vérifier que Sentry est actif

```bash
# Build avec Sentry
npm run build

# Vérifier les logs - vous devriez voir :
# [Sentry] Uploading source maps...
# [Sentry] Source maps uploaded successfully
```

### 2. Tester en développement

Ajouter dans `app/test-sentry/page.tsx` :

```typescript
'use client'

export default function TestSentry() {
  const handleError = () => {
    throw new Error('Test Sentry Error - Client Side')
  }

  return (
    <div>
      <button onClick={handleError}>Test Sentry Error</button>
    </div>
  )
}
```

### 3. Tester en production

Une fois déployé, créer une route de test ou déclencher une erreur réelle.

---

## 🎛️ Configuration Avancée

### Personnaliser le Sampling Rate

Modifier dans `sentry.client.config.ts` et `sentry.server.config.ts` :

```typescript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
// 10% en production, 100% en dev
```

### Ajouter des Tags Personnalisés

```typescript
Sentry.setTag('environment', process.env.NODE_ENV)
Sentry.setTag('version', '1.0.0')
```

### Filtrer les Erreurs

```typescript
beforeSend(event, hint) {
  // Ignorer les erreurs spécifiques
  if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
    return null
  }
  return event
}
```

---

## 📝 Variables d'Environnement Complètes

```env
# Required
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=votre-org
SENTRY_PROJECT=votre-project

# Optional (pour source maps upload)
SENTRY_AUTH_TOKEN=votre-token

# Optional (pour releases)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

---

## 🚨 Dépannage

### Erreur: "Sentry DSN not configured"

- Vérifier que `NEXT_PUBLIC_SENTRY_DSN` est défini
- Redémarrer le serveur de développement

### Source maps non uploadés

- Vérifier `SENTRY_AUTH_TOKEN`
- Vérifier les permissions du token (project:releases, org:read)
- Vérifier `SENTRY_ORG` et `SENTRY_PROJECT`

### Erreurs non capturées

- Vérifier que Sentry est activé (DSN présent)
- Vérifier les filtres `beforeSend`
- Vérifier la console du navigateur pour les erreurs réseau

---

## 📚 Ressources

- [Documentation Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Configuration Sentry](https://docs.sentry.io/platforms/javascript/configuration/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

---

## ✅ Checklist

- [ ] Compte Sentry créé
- [ ] Projet Next.js créé
- [ ] DSN copié
- [ ] Variables d'environnement ajoutées
- [ ] Test d'erreur effectué
- [ ] Erreur visible dans dashboard Sentry
- [ ] Source maps uploadés (production)
- [ ] Performance monitoring vérifié

---

**🎉 Sentry est maintenant configuré et prêt à capturer les erreurs !**
