# 🔗 Intégration Sentry ↔ GitHub

**Date**: 1er Novembre 2025  
**Status**: ✅ DSN Configuré - Intégration GitHub à activer

---

## 📋 Configuration Actuelle

### DSN Sentry

```
https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
```

### Informations Extraites

- **Organization ID**: `o4510290746146816`
- **Project ID**: `4510290759581776`
- **Region**: `de` (Allemagne)
- **DSN Key**: `500276df8605b31faf438668d5d366bc`

---

## 🚀 Activer l'Intégration GitHub

### 1. Dans Sentry Dashboard

1. **Accéder aux Settings de l'Organisation**
   - Aller sur [sentry.io](https://sentry.io)
   - Ouvrir votre organisation
   - Settings → Integrations

2. **Installer GitHub Integration**
   - Cliquer sur "GitHub" dans la liste des intégrations
   - Cliquer sur "Install" ou "Configure"
   - Autoriser Sentry à accéder à votre compte GitHub

3. **Sélectionner le Repository**
   - Choisir `torp-fr/torp-25` (ou votre repo)
   - Autoriser l'accès

### 2. Configuration du Projet

1. **Dans le Projet Sentry**
   - Settings → Projects → `torp-platform`
   - Section "Issue Tracking"
   - Sélectionner "GitHub"
   - Configurer le repository mapping

### 3. Fonctionnalités Activées

Une fois connecté, Sentry peut :

- ✅ Créer des issues GitHub automatiquement
- ✅ Associer les erreurs aux commits
- ✅ Lier les releases aux tags Git
- ✅ Afficher le code source dans Sentry
- ✅ Créer des PRs avec des fixes automatiques

---

## 🔧 Configuration Automatique dans le Code

Les fichiers suivants ont été mis à jour avec le DSN :

### Configuration Files

- ✅ `sentry.client.config.ts` - DSN par défaut
- ✅ `sentry.server.config.ts` - DSN par défaut
- ✅ `sentry.edge.config.ts` - DSN par défaut
- ✅ `next.config.ts` - Org et Project par défaut

### Variables d'Environnement

Pour la production (Vercel), ajoutez :

```env
NEXT_PUBLIC_SENTRY_DSN=https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
SENTRY_ORG=o4510290746146816
SENTRY_PROJECT=torp-platform
```

**Note**: Le DSN est déjà hardcodé comme fallback, mais les variables d'environnement prennent priorité.

---

## 📊 Releases et Déploiements

### Créer une Release dans Sentry

Avec l'intégration GitHub, Sentry peut automatiquement :

1. **Détecter les Releases**
   - Basé sur les tags Git
   - Basé sur les déploiements Vercel

2. **Associer les Erreurs aux Releases**
   - Identifier dans quelle version l'erreur est apparue
   - Suivre les corrections

### Configuration Automatique (Recommandé)

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "sentry:release": "sentry-cli releases new $npm_package_version && sentry-cli releases set-commits $npm_package_version --auto"
  }
}
```

---

## 🧪 Tester l'Intégration

### 1. Générer une Erreur de Test

```bash
# Visiter la page de test
http://localhost:3000/test-sentry

# Ou via API
curl http://localhost:3000/api/test-sentry
```

### 2. Vérifier dans Sentry

1. Aller sur le dashboard Sentry
2. Vérifier que l'erreur apparaît dans "Issues"
3. Vérifier que l'erreur est associée au commit GitHub (si intégration activée)

### 3. Vérifier l'Association GitHub

- Dans Sentry, ouvrir une issue
- Vérifier la section "Linked Issues"
- Vérifier les "Suspect Commits"

---

## 🎯 Fonctionnalités GitHub

### Issues Automatiques

Sentry peut créer des issues GitHub automatiquement quand :

- Une erreur se produit plus de X fois
- Une erreur affecte plus de X utilisateurs
- Une erreur est marquée comme critique

**Configuration** :

- Settings → Projects → `torp-platform`
- Issue Tracking → GitHub
- Activer "Create Issues Automatically"

### Suspect Commits

Sentry identifie automatiquement les commits qui ont introduit une erreur :

- Basé sur les stack traces
- Basé sur l'historique Git
- Basé sur les releases

### Release Tracking

Associer les releases Sentry aux tags Git :

- Créer un tag : `git tag v1.0.0`
- Sentry détectera automatiquement la release
- Les erreurs seront associées à cette release

---

## 📝 Configuration Recommandée

### 1. Vercel Environment Variables

Dans Vercel Dashboard → Settings → Environment Variables :

```env
NEXT_PUBLIC_SENTRY_DSN=https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
SENTRY_ORG=o4510290746146816
SENTRY_PROJECT=torp-platform
```

### 2. GitHub Actions (Optionnel)

Créer `.github/workflows/sentry-release.yml` :

```yaml
name: Sentry Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: o4510290746146816
          SENTRY_PROJECT: torp-platform
```

---

## ✅ Checklist d'Intégration

- [x] DSN configuré dans le code
- [x] Organisation configurée
- [x] Projet configuré
- [ ] Intégration GitHub activée dans Sentry
- [ ] Repository GitHub lié
- [ ] Issues automatiques configurées
- [ ] Variables d'environnement ajoutées (Vercel)
- [ ] Test d'erreur effectué
- [ ] Erreur visible dans Sentry
- [ ] Association GitHub vérifiée

---

## 🔗 Liens Utiles

- [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/)
- [GitHub Integration Docs](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)
- [Page de Test](/test-sentry)

---

**🎉 Sentry est configuré avec DSN par défaut. Activez l'intégration GitHub dans le dashboard Sentry pour les fonctionnalités avancées !**
