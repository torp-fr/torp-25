# 🔗 Intégration Sentry ↔ GitHub - Guide Complet

**Date**: 1er Novembre 2025  
**Status**: ✅ Code préparé - Activation dashboard requise

---

## 🎯 Objectif

Intégrer Sentry avec GitHub pour :

- ✅ Identifier automatiquement les commits qui ont introduit des erreurs
- ✅ Créer des issues GitHub automatiquement
- ✅ Lier les erreurs aux releases Git
- ✅ Afficher le code source dans Sentry avec liens vers GitHub

---

## 📋 Prérequis

- ✅ DSN Sentry configuré
- ✅ Repository GitHub: `torp-fr/torp-25`
- ✅ Variables Vercel configurées
- ✅ Release tracking configuré dans le code (✅ Fait)

---

## 🚀 Activation via Dashboard Sentry

### Étape 1: Accéder à l'Intégration

1. Aller sur [sentry.io](https://sentry.io)
2. Se connecter
3. Ouvrir l'organisation: `o4510290746146816`
4. Settings → Integrations
5. Rechercher "GitHub"
6. Cliquer sur "Install" ou "Configure"

### Étape 2: Autoriser GitHub

1. Cliquer sur "Authorize GitHub"
2. Sélectionner le compte/organisation GitHub approprié
3. Autoriser Sentry à accéder aux repositories
4. **Important**: Autoriser l'accès à `torp-fr/torp-25`

### Étape 3: Configurer le Repository

1. **Repository**: Sélectionner `torp-fr/torp-25`
2. **Create Issues Automatically**:
   - ☑️ Activer si souhaité (créer issues GitHub automatiquement)
   - Ou laisser désactivé pour contrôle manuel
3. **Suspect Commits**:
   - ☑️ **Activé** (recommandé) - Identifie les commits problématiques
4. **Release Tracking**:
   - ☑️ **Activé** (recommandé) - Associe les erreurs aux releases

### Étape 4: Options Avancées (Optionnel)

- **Commit Integration**: Lier les commits aux erreurs
- **Pull Request Integration**: Lier les PRs aux erreurs
- **Issue Assignment**: Assigner automatiquement les issues

---

## 🔧 Configuration Code (Déjà Fait)

Le code est déjà configuré pour supporter l'intégration GitHub :

### Release Tracking

Les fichiers suivants sont configurés :

- ✅ `sentry.client.config.ts` - Release tracking client
- ✅ `sentry.server.config.ts` - Release tracking serveur
- ✅ `sentry.edge.config.ts` - Release tracking edge

### Sources de Release

Le release est automatiquement détecté depuis :

1. `SENTRY_RELEASE` (variable d'environnement)
2. `VERCEL_GIT_COMMIT_SHA` (Vercel)
3. Git commit SHA local (développement)

### Scripts Disponibles

```bash
# Configurer le release tracking
npm run sentry:setup-release

# Tester l'intégration complète
npm run sentry:test-integration
```

---

## 🧪 Tester l'Intégration

### 1. Générer une Erreur de Test

**Production (Vercel)**:

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

**Local**:

```bash
npm run dev
# Puis visiter: http://localhost:3000/test-sentry-complete
```

### 2. Vérifier dans Sentry

1. Ouvrir le [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/)
2. Attendre 10-30 secondes
3. Ouvrir la nouvelle issue

### 3. Vérifier l'Intégration GitHub

Dans l'issue Sentry, vérifier :

#### Suspect Commits (si activé)

- Section "Suspect Commits" visible
- Commits listés avec liens vers GitHub
- Commits identifiés comme ayant introduit l'erreur

#### Release (si activé)

- Release visible dans l'issue
- Liens vers le commit/tag GitHub
- Erreurs groupées par release

#### Code Context (automatique)

- Code source visible avec numéros de ligne
- Liens vers GitHub pour chaque fichier
- Blame information disponible

#### Linked Issues (si activé)

- Section "Linked Issues" visible
- Issue GitHub créée automatiquement (si configuré)
- Liens bidirectionnels Sentry ↔ GitHub

---

## 📊 Fonctionnalités Disponibles

### Suspect Commits

Sentry identifie automatiquement les commits qui ont introduit une erreur :

- Basé sur les stack traces
- Basé sur l'historique Git
- Liens directs vers les commits GitHub
- Affiche l'auteur et la date du commit

### Release Tracking

Associe les erreurs aux releases Git :

- Créer un tag: `git tag v1.0.0 && git push --tags`
- Sentry détecte automatiquement le release
- Erreurs groupées par release
- Métriques par release

### Code Context

Affiche le code source dans Sentry :

- Liens directs vers GitHub
- Numéros de ligne exacts
- Diff avec les commits
- Blame information (auteur de chaque ligne)

### Linked Issues

Crée des issues GitHub automatiquement :

- Quand erreur se produit X fois
- Quand erreur affecte X utilisateurs
- Quand erreur est marquée critique
- Liens bidirectionnels

---

## ✅ Checklist d'Activation

- [ ] Intégration GitHub installée dans Sentry Dashboard
- [ ] Repository `torp-fr/torp-25` sélectionné
- [ ] Permissions GitHub autorisées
- [ ] Suspect Commits activé
- [ ] Release Tracking activé
- [ ] Create Issues configuré (optionnel)
- [ ] Test d'erreur effectué
- [ ] Issue visible dans Sentry
- [ ] Suspect Commits visible dans l'issue
- [ ] Liens GitHub fonctionnels

---

## 🔗 Liens Utiles

- [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/)
- [Integrations GitHub](https://sentry.io/settings/o4510290746146816/integrations/github/)
- [Repository GitHub](https://github.com/torp-fr/torp-25)
- [Documentation Sentry GitHub](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)

---

## 🐛 Dépannage

### Suspect Commits non visibles

**Cause**: Repository non configuré ou permissions manquantes

**Solution**:

1. Vérifier que le repository est bien sélectionné
2. Vérifier les permissions GitHub
3. Vérifier que les commits sont bien dans le repository

### Release non détecté

**Cause**: Tag Git non créé ou variable `SENTRY_RELEASE` non configurée

**Solution**:

1. Créer un tag: `git tag v1.0.0 && git push --tags`
2. Configurer `SENTRY_RELEASE` dans Vercel (optionnel, auto-détecté)

### Code Context non disponible

**Cause**: Source maps non uploadés ou permissions manquantes

**Solution**:

1. Configurer `SENTRY_AUTH_TOKEN` dans Vercel
2. Upload des source maps (automatique avec Vercel integration)

---

**💡 Une fois l'intégration activée dans le dashboard, toutes les fonctionnalités seront automatiquement disponibles !**
