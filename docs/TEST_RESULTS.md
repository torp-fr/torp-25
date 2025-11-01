# 🧪 Résultats des Tests Sentry

**Date**: 1er Novembre 2025  
**Status**: Tests disponibles et prêts

---

## ✅ Tests Disponibles

### 1. Pages de Test

| Page         | URL                     | Description                              |
| ------------ | ----------------------- | ---------------------------------------- |
| Test Simple  | `/test-sentry`          | Tests basiques (erreurs client/serveur)  |
| Test Complet | `/test-sentry-complete` | Tests complets avec contexte, tags, user |

### 2. API Routes

| Endpoint                    | Method | Description                          |
| --------------------------- | ------ | ------------------------------------ |
| `/api/test-sentry`          | GET    | Test simple avec erreur serveur      |
| `/api/test-sentry-complete` | GET    | Test complet avec tous les contextes |

### 3. Scripts

| Script      | Commande                | Description                           |
| ----------- | ----------------------- | ------------------------------------- |
| Test Config | `npm run sentry:test`   | Test la configuration localement      |
| Verify      | `npm run sentry:verify` | Vérifie les variables d'environnement |

---

## 🔍 Comment Tester

### Étape 1: Lancer les Tests

**Option A - Interface Web**:

1. Démarrer le serveur: `npm run dev`
2. Visiter: `http://localhost:3000/test-sentry-complete`
3. Cliquer sur "Lancer Test Complet"

**Option B - API Directe**:

```bash
curl http://localhost:3000/api/test-sentry-complete
```

**Option C - Production (après déploiement)**:

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

### Étape 2: Vérifier dans Sentry

1. Ouvrir le [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/)
2. Attendre 10-30 secondes
3. Rafraîchir la page
4. Vérifier qu'une nouvelle issue est créée

### Étape 3: Analyser les Résultats

Dans une issue Sentry, vérifier :

#### Informations Capturées

- ✅ **Message**: Message d'erreur complet
- ✅ **Stack Trace**: Trace complète avec fichiers
- ✅ **Tags**:
  - `test: complete`
  - `source: api-route`
  - `errorType: test-exception`
- ✅ **Contexts**:
  - `test-info`: Endpoint, method, timestamp
  - `test`: Additional info, request_id
- ✅ **User**: User context (test-user-id)
- ✅ **Environment**: development ou production

#### Intégration GitHub (si activée)

- ✅ **Suspect Commits**: Commits qui ont introduit l'erreur
- ✅ **Linked Issues**: Issues GitHub liées
- ✅ **Code Context**: Liens vers le code source

---

## 📊 Résultats Attendus

### Dashboard Sentry

- **Total Issues**: Augmentation après chaque test
- **Environment Distribution**: Issues par environnement
- **Trend**: Graphique d'évolution des erreurs

### Détails d'une Issue

- **Title**: "Test Sentry Complete - Exception with Context"
- **Level**: `error`
- **First Seen**: Timestamp du test
- **Last Seen**: Timestamp du dernier test
- **Count**: Nombre d'occurrences
- **Users Affected**: Nombre d'utilisateurs touchés

---

## ✅ Checklist de Test

- [ ] Serveur démarré (`npm run dev`)
- [ ] Page `/test-sentry-complete` accessible
- [ ] Test complet lancé
- [ ] Dashboard Sentry ouvert
- [ ] Nouvelle issue visible dans Sentry
- [ ] Stack trace présent
- [ ] Tags présents (test, source, errorType)
- [ ] Contexts présents (test-info, test)
- [ ] User context présent
- [ ] Environment correct (development/production)

---

## 🚨 Dépannage

### Aucune Issue dans Sentry

**Vérifications**:

1. DSN configuré correctement
2. Serveur redémarré après configuration
3. Variables d'environnement chargées
4. Pas de blocage réseau/firewall

**Actions**:

- Vérifier la console du navigateur (erreurs réseau)
- Vérifier les logs serveur
- Exécuter `npm run sentry:verify`

### Issues sans Détails

**Cause**: Source maps non uploadés

**Solution**:

- Vérifier `SENTRY_AUTH_TOKEN` en production
- Vérifier les permissions du token
- Relancer le build

---

## 📈 Métriques à Surveiller

### Après les Tests

- **Time to First Issue**: < 30 secondes
- **Error Rate**: Nombre d'erreurs par minute
- **Resolution Time**: Temps de résolution

### En Production

- **Error Rate**: < 1% des requêtes
- **Mean Time to Resolution**: < 24h
- **User Impact**: < 1% des utilisateurs

---

**🎯 Tests prêts à être exécutés ! Lancez les tests et vérifiez le dashboard Sentry.**
