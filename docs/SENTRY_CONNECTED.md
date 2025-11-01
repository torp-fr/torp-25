# ✅ Sentry Connecté et Configuré

**Date**: 1er Novembre 2025  
**Status**: ✅ **Actif et Opérationnel**

---

## 🔗 Configuration Sentry

### DSN Configuré

```
https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
```

### Informations du Projet

- **Organization**: `o4510290746146816`
- **Project**: `torp-platform`
- **Region**: `de` (Allemagne)
- **Integration**: GitHub (automatique)

---

## ✅ Configuration Automatique

Les fichiers suivants ont été mis à jour avec le DSN :

1. **sentry.client.config.ts** - Configuration client
2. **sentry.server.config.ts** - Configuration serveur
3. **sentry.edge.config.ts** - Configuration edge
4. **next.config.ts** - Wrapper Sentry avec org/project

### Variables d'Environnement

Les valeurs par défaut sont configurées dans le code, mais pour la production, ajoutez dans `.env.local` ou Vercel :

```env
NEXT_PUBLIC_SENTRY_DSN=https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
SENTRY_ORG=o4510290746146816
SENTRY_PROJECT=torp-platform
```

---

## 🧪 Tester la Configuration

### 1. Via l'Interface Web

Visitez: **`http://localhost:3000/test-sentry`**

Cette page permet de :

- Générer des erreurs client side
- Générer des erreurs server side
- Envoyer des messages Sentry
- Vérifier le statut de la configuration

### 2. Via l'API

```bash
curl http://localhost:3000/api/test-sentry
```

### 3. Vérification Script

```bash
npm run sentry:verify
```

---

## 📊 Fonctionnalités Activées

### Error Tracking ✅

- Erreurs JavaScript automatiquement capturées
- Erreurs serveur (API routes)
- Erreurs edge (middleware)
- Source maps automatiques

### Performance Monitoring ✅

- Transaction tracking (10% en prod, 100% en dev)
- Performance traces pour les pages
- Temps de réponse API

### Session Replay ✅

- Replay des sessions avec erreurs (100%)
- Replay des sessions normales (10%)
- Masquage automatique des données sensibles

### GitHub Integration ✅

- Déploiements automatiquement trackés
- Releases associées aux commits
- Issues liées aux erreurs

---

## 🎯 Dashboard Sentry

Accédez au dashboard :

1. Aller sur [sentry.io](https://sentry.io)
2. Sélectionner l'organisation
3. Ouvrir le projet `torp-platform`

### Vue d'ensemble

- **Issues**: Liste des erreurs capturées
- **Performance**: Métriques de performance
- **Releases**: Historique des déploiements
- **Replays**: Enregistrements des sessions

---

## 🔍 Vérification Rapide

### 1. Vérifier que Sentry est actif

```typescript
// Dans la console du navigateur (dev)
console.log(window.Sentry) // Devrait afficher l'objet Sentry
```

### 2. Générer une erreur de test

Visitez `/test-sentry` et cliquez sur un bouton de test.

### 3. Vérifier dans Sentry

L'erreur devrait apparaître dans le dashboard Sentry sous **Issues** dans les 10-30 secondes.

---

## 🚀 Production (Vercel)

Pour la production sur Vercel, ajoutez ces variables d'environnement :

```env
NEXT_PUBLIC_SENTRY_DSN=https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
SENTRY_ORG=o4510290746146816
SENTRY_PROJECT=torp-platform
```

Avec l'intégration GitHub, Sentry peut aussi :

- Détecter automatiquement les releases
- Associer les erreurs aux commits
- Créer des issues GitHub automatiquement

---

## 📈 Métriques Surveillées

### Erreurs

- Nombre d'erreurs par type
- Fréquence d'occurrence
- Utilisateurs affectés
- Stack traces complets

### Performance

- Temps de chargement des pages
- Temps de réponse API
- Transactions lentes
- Requêtes DB lentes

### Sessions

- Taux d'erreur
- Sessions actives
- Géolocalisation des erreurs
- Appareils et navigateurs

---

## 🛠️ Utilisation Avancée

### Ajouter du Contexte Personnalisé

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.setUser({
  id: user.id,
  email: user.email,
})

Sentry.setTag('feature', 'quote-analysis')
Sentry.setContext('devis', {
  id: devis.id,
  score: devis.score,
})
```

### Capturer une Erreur Manuellement

```typescript
try {
  // Code qui peut échouer
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'QuoteAnalysis',
    },
    level: 'error',
  })
}
```

### Envoyer un Message

```typescript
Sentry.captureMessage('Important event occurred', {
  level: 'info',
  tags: {
    event: 'user-action',
  },
})
```

---

## ✅ Checklist

- [x] DSN configuré
- [x] Organisation configurée
- [x] Projet configuré
- [x] Fichiers de configuration mis à jour
- [x] GitHub integration activée
- [ ] Test d'erreur effectué
- [ ] Erreur visible dans dashboard Sentry
- [ ] Variables d'environnement ajoutées (production)

---

## 🔗 Liens Utiles

- [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/)
- [Documentation Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Page de Test](/test-sentry)

---

**🎉 Sentry est maintenant actif et prêt à capturer les erreurs !**
