# 🧪 Test de l'Intégration Sentry ↔ GitHub

**Date**: 1er Novembre 2025  
**Status**: ✅ Tests prêts à exécuter

---

## 🚀 Tests Disponibles

### 1. Test Complet d'Intégration

```bash
npm run sentry:test-integration
```

Ce test vérifie :

- ✅ Configuration DSN
- ✅ Initialisation SDK
- ✅ Variables d'environnement
- ✅ Envoi de message
- ✅ Exception avec contexte
- ✅ User context
- ✅ Release tracking

### 2. Test Production

**API Endpoint**:

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

**Interface Web**:

```
https://torp-platform.vercel.app/test-sentry-complete
```

---

## ✅ Vérification dans Sentry

### Après le Test

1. **Ouvrir le Dashboard**
   - https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/

2. **Attendre 10-30 secondes**

3. **Ouvrir la nouvelle issue**

4. **Vérifier** :
   - ✅ Stack trace complet
   - ✅ Tags et contexts
   - ✅ Release (si configuré)
   - ✅ **Suspect Commits** (si intégration GitHub activée)
   - ✅ **Code Context** avec liens GitHub
   - ✅ **Linked Issues** (si configuré)

---

## 🔗 Intégration GitHub - Vérifications

### Suspect Commits

Si l'intégration GitHub est activée, vous devriez voir :

- Section "Suspect Commits" dans l'issue
- Liste des commits qui ont introduit l'erreur
- Liens vers les commits GitHub
- Auteur et date de chaque commit

### Release Tracking

- Release visible dans l'issue
- Lien vers le commit/tag GitHub
- Erreurs groupées par release

### Code Context

- Code source visible avec numéros de ligne
- Liens vers GitHub pour chaque fichier
- Diff avec les commits précédents

---

## 📋 Checklist de Test

- [ ] Test d'intégration exécuté (`npm run sentry:test-integration`)
- [ ] Test production exécuté (via curl ou interface)
- [ ] Dashboard Sentry ouvert
- [ ] Nouvelle issue visible
- [ ] Suspect Commits visible (si intégration activée)
- [ ] Release visible (si configuré)
- [ ] Code Context avec liens GitHub
- [ ] Linked Issues (si configuré)

---

## 🎯 Résultats Attendus

### Sans Intégration GitHub

- ✅ Issues créées normalement
- ✅ Stack traces complets
- ✅ Tags et contexts
- ⚠️ Pas de Suspect Commits
- ⚠️ Pas de liens GitHub

### Avec Intégration GitHub

- ✅ Tout ce qui est ci-dessus
- ✅ Suspect Commits avec liens GitHub
- ✅ Code Context avec liens vers fichiers
- ✅ Release avec lien vers tag/commit
- ✅ Linked Issues (si configuré)

---

**💡 Pour activer l'intégration GitHub, suivez le guide: `docs/GITHUB_INTEGRATION_COMPLETE.md`**
