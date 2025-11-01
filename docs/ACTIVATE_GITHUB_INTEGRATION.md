# 🔗 Activer l'Intégration Sentry ↔ GitHub

**Date**: 1er Novembre 2025  
**Status**: DSN Configuré ✅ - Intégration GitHub à activer

---

## 🚀 Activation Rapide

### 1. Accéder au Dashboard Sentry

1. Aller sur [sentry.io](https://sentry.io)
2. Se connecter à votre compte
3. Ouvrir l'organisation: `o4510290746146816`
4. Ouvrir le projet: `torp-platform`

### 2. Installer l'Intégration GitHub

**Option A: Via Settings de l'Organisation** (Recommandé)

1. Settings → Integrations
2. Rechercher "GitHub"
3. Cliquer sur "Install" ou "Configure"
4. Autoriser Sentry à accéder à GitHub
5. Sélectionner le repository: `torp-fr/torp-25`

**Option B: Via Settings du Projet**

1. Settings → Projects → `torp-platform`
2. Section "Issue Tracking"
3. Cliquer sur "GitHub"
4. Configurer et autoriser

### 3. Configurer les Options

Une fois l'intégration installée, configurez :

- ✅ **Repository**: `torp-fr/torp-25`
- ✅ **Create Issues Automatically**: Activer si souhaité
- ✅ **Suspect Commits**: Activer pour identifier les commits problématiques
- ✅ **Release Tracking**: Activer pour lier les releases aux tags Git

---

## 🧪 Tester l'Intégration

### 1. Générer une Erreur de Test

```bash
# Via l'interface web
http://localhost:3000/test-sentry-complete

# Ou via API
curl http://localhost:3000/api/test-sentry-complete
```

### 2. Vérifier dans Sentry

1. Ouvrir le [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/)
2. Vérifier qu'une nouvelle issue est créée
3. Ouvrir l'issue pour voir :
   - **Suspect Commits**: Commits qui ont introduit l'erreur
   - **Linked Issues**: Issues GitHub liées (si activé)
   - **Release**: Release associée (si tag Git présent)

### 3. Vérifier l'Association GitHub

Dans une issue Sentry, vérifier :

- Section "Suspect Commits" avec liens vers GitHub
- Section "Linked Issues" si issues GitHub créées
- Code source visible avec liens vers GitHub

---

## 📊 Fonctionnalités Disponibles

### Suspect Commits

Sentry identifie automatiquement les commits qui ont introduit une erreur :

- Basé sur les stack traces
- Basé sur l'historique Git
- Liens directs vers les commits GitHub

### Linked Issues

Créer des issues GitHub automatiquement :

- Quand erreur se produit X fois
- Quand erreur affecte X utilisateurs
- Quand erreur est marquée critique

### Release Tracking

Associer les releases Sentry aux tags Git :

- Créer un tag: `git tag v1.0.0 && git push --tags`
- Sentry détecte automatiquement
- Erreurs associées à cette release

### Code Context

Afficher le code source dans Sentry :

- Liens directs vers GitHub
- Diff avec les commits
- Blame information

---

## ✅ Checklist d'Activation

- [ ] Intégration GitHub installée dans Sentry
- [ ] Repository `torp-fr/torp-25` sélectionné
- [ ] Permissions GitHub autorisées
- [ ] Create Issues automatique configuré (optionnel)
- [ ] Suspect Commits activé
- [ ] Release Tracking activé
- [ ] Test d'erreur effectué
- [ ] Issue visible dans Sentry
- [ ] Association GitHub vérifiée

---

## 🔗 Liens Utiles

- [Dashboard Sentry](https://sentry.io/organizations/o4510290746146816/projects/torp-platform/)
- [Integrations GitHub](https://sentry.io/settings/o4510290746146816/integrations/github/)
- [Documentation Integration](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)

---

**💡 Note**: Une fois l'intégration activée, Sentry pourra automatiquement associer les erreurs aux commits GitHub et créer des issues si configuré.
