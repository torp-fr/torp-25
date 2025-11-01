# 🧪 Tester la Configuration Sentry

**Date**: 1er Novembre 2025  
**Status**: ✅ Prêt à tester

---

## 🚀 Tests Disponibles

### 1. Test Rapide via Interface Web

**Page de test simple**:

```
http://localhost:3000/test-sentry
```

**Page de test complète**:

```
http://localhost:3000/test-sentry-complete
```

Cette page teste :

- ✅ Messages Sentry
- ✅ Contexte personnalisé
- ✅ Tags personnalisés
- ✅ User context
- ✅ Exceptions avec stack traces
- ✅ Erreurs client side

### 2. Test via API

**Test simple**:

```bash
curl http://localhost:3000/api/test-sentry
```

**Test complet**:

```bash
curl http://localhost:3000/api/test-sentry-complete
```

### 3. Test via Script

**Local**:

```bash
npm run sentry:test
```

**Production** (après déploiement):

```bash
NEXT_PUBLIC_APP_URL=https://torp-platform.vercel.app tsx scripts/test-sentry-production.ts
```

---

## ✅ Vérification dans Sentry

### 1. Accéder au Dashboard

Ouvrir: https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/

### 2. Vérifier les Issues

Après avoir lancé un test :

1. Attendre 10-30 secondes
2. Rafraîchir la page Sentry
3. Vérifier qu'une nouvelle issue est créée

### 3. Vérifier les Détails

Dans une issue, vérifier :

- ✅ Stack trace complet
- ✅ Contexte personnalisé
- ✅ Tags (test, source, etc.)
- ✅ User context (si configuré)
- ✅ Environment (development/production)
- ✅ Release (si tag Git)

---

## 🎯 Tests Recommandés

### Test 1: Message Simple

```typescript
Sentry.captureMessage('Test message', 'info')
```

### Test 2: Exception avec Contexte

```typescript
try {
  throw new Error('Test error')
} catch (error) {
  Sentry.captureException(error, {
    tags: { test: 'true' },
    context: { additional: 'info' },
  })
}
```

### Test 3: Client Side Error

Dans `/test-sentry-complete`, cliquer sur "Générer Erreur Client"

---

## 📊 Résultats Attendus

### Dashboard Sentry

- **Issues**: 1+ nouvelles issues
- **Environment**: `development` ou `production`
- **First Seen**: Date/heure du test
- **Count**: Nombre d'occurrences

### Détails d'une Issue

- **Title**: Message d'erreur
- **Level**: `error`, `warning`, `info`
- **Tags**: Tous les tags ajoutés
- **User**: User context si défini
- **Contexts**: Tous les contextes personnalisés
- **Stack Trace**: Trace complète avec fichiers et lignes

---

## 🔗 Intégration GitHub (Après Activation)

Une fois l'intégration GitHub activée, vous verrez aussi :

- **Suspect Commits**: Commits qui ont introduit l'erreur
- **Linked Issues**: Issues GitHub créées automatiquement
- **Code Context**: Liens vers le code source sur GitHub

---

**✅ Prêt à tester ! Lancez les tests et vérifiez le dashboard Sentry.**
