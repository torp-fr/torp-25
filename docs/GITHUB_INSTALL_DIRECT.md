# 🔗 Installation Directe GitHub Sentry - Guide Rapide

**Date**: 1er Novembre 2025  
**Action**: Installation manuelle requise

---

## 🚀 Liens Directs

### 1. Page d'Installation GitHub

**👉 https://sentry.io/settings/o4510290746146816/integrations/github/**

### 2. Dashboard du Projet

**👉 https://sentry.io/organizations/o4510290746146816/projects/torp-platform/**

### 3. Issue Tracking Settings

**👉 https://sentry.io/settings/o4510290746146816/projects/torp-platform/issue-tracking/**

---

## 📋 Instructions Rapides

### Étape 1: Installer GitHub Integration

1. **Ouvrir le lien d'intégration** ci-dessus
2. **Cliquer sur "Install"** ou "Add Installation"
3. **Si première fois**:
   - Cliquer sur "Authorize GitHub"
   - Sélectionner le compte/organisation GitHub (`torp-fr`)
   - Autoriser les permissions:
     - ✅ Repository access (read)
     - ✅ Commit status (write)
     - ✅ Pull requests (read)
     - ✅ Issues (write)

### Étape 2: Sélectionner le Repository

1. **Dans la liste des repositories**, trouver:
   - `torp-fr/torp-25`
2. **Cliquer sur "Configure"** ou sélectionner le repository
3. **Sauvegarder**

### Étape 3: Activer les Options

Dans les paramètres de l'intégration, activer:

- ☑️ **Suspect Commits** (Recommandé)
  - Identifie les commits qui ont introduit des erreurs
- ☑️ **Release Tracking** (Recommandé)
  - Associe les erreurs aux tags Git

- ☐ **Create Issues Automatically** (Optionnel)
  - Crée des issues GitHub automatiquement
  - Peut être configuré plus tard

---

## 🧪 Tester

### 1. Générer une Erreur de Test

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

### 2. Vérifier dans Sentry

1. **Ouvrir**: https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/
2. **Attendre 10-30 secondes**
3. **Vérifier que l'issue a**:
   - ✅ Suspect Commits (avec liens GitHub)
   - ✅ Code Context (avec liens vers fichiers)
   - ✅ Release (si tag Git créé)

---

## ✅ Vérification

Une fois installé, vérifiez:

1. **Dans Sentry Dashboard**:
   - Settings → Integrations → GitHub
   - Doit montrer "Installed" avec `torp-fr/torp-25`

2. **Dans une Issue Sentry**:
   - Section "Suspect Commits" visible
   - Liens vers GitHub fonctionnels
   - Code Context avec liens vers fichiers

---

## 🐛 Problèmes

### "Installation not found"

→ L'intégration n'a pas été installée, réessayez l'Étape 1

### "Repository not found"

→ Vérifiez les permissions GitHub et l'accès au repository

### "Suspect Commits not showing"

→ Vérifiez que l'option est activée et attendez quelques minutes

---

## 📝 Script de Vérification

```bash
npm run sentry:github-guide
```

Affiche les liens directs et instructions complètes.

---

**💡 L'installation se fait uniquement via le dashboard Sentry (OAuth GitHub requis)**
