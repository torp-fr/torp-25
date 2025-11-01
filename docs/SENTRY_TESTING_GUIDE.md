# 🧪 Guide de Test Sentry

**Date**: 1er Novembre 2025  
**Status**: ✅ Prêt à tester

---

## 🚀 Tests Disponibles

### 1. Test Complet (Recommandé)

**Interface Web**:

```
http://localhost:3000/test-sentry-complete
```

**API Directe**:

```bash
curl http://localhost:3000/api/test-sentry-complete
```

**Production (Vercel)**:

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

### 2. Test Simple

**Interface Web**:

```
http://localhost:3000/test-sentry
```

**API Directe**:

```bash
curl http://localhost:3000/api/test-sentry
```

---

## ✅ Vérification dans Sentry Dashboard

1. **Ouvrir le Dashboard**
   - https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/

2. **Attendre 10-30 secondes** après le test

3. **Rafraîchir la page** - Une nouvelle issue devrait apparaître

4. **Vérifier les détails** :
   - ✅ Stack trace complet
   - ✅ Tags (test, source, errorType)
   - ✅ Contexts (test-info, test)
   - ✅ User context
   - ✅ Environment (development/production)

---

## 📊 Ce qui est Testé

### Test Complet (`/api/test-sentry-complete`)

- ✅ Message Sentry avec tags
- ✅ Contexte personnalisé (test-info)
- ✅ Tags personnalisés (test-type, test-version)
- ✅ User context (test-user-id)
- ✅ Exception avec stack trace complète
- ✅ Contexts additionnels (test)

### Informations Capturées

Chaque test envoie à Sentry :

- **Message**: "Test Sentry Complete - API Route"
- **Exception**: "Test Sentry Complete - Exception with Context"
- **Tags**: test, source, endpoint, errorType
- **Contexts**: test-info, test
- **User**: id, email, username
- **Environment**: NODE_ENV

---

## 🔗 Intégration GitHub

Une fois l'intégration GitHub activée dans Sentry Dashboard, vous verrez aussi :

- **Suspect Commits**: Commits qui ont introduit l'erreur
- **Linked Issues**: Issues GitHub créées automatiquement
- **Code Context**: Liens vers le code source

---

## ✅ Checklist de Test

- [ ] Serveur démarré ou production déployée
- [ ] Test lancé (via interface ou API)
- [ ] Dashboard Sentry ouvert
- [ ] Nouvelle issue visible
- [ ] Stack trace présent
- [ ] Tous les tags présents
- [ ] Contexts présents
- [ ] User context présent

---

**🎯 Prêt à tester ! Lancez les tests et vérifiez le dashboard Sentry.**
