# 🔗 Guide Pas à Pas - Intégration GitHub dans Sentry

**Date**: 1er Novembre 2025  
**Difficulté**: Simple - Suivez les étapes une par une

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte Sentry (gratuit)
- ✅ Un compte GitHub avec accès au repository `torp-fr/torp-25`
- ✅ Les droits administrateur sur le repository GitHub

---

## 🚀 ÉTAPE 1 : Accéder à la Page d'Intégration

### Option A : Lien Direct (Recommandé)

1. **Ouvrez ce lien dans votre navigateur** :

   ```
   https://sentry.io/settings/o4510290746146816/integrations/github/
   ```

2. **Si vous n'êtes pas connecté à Sentry** :
   - Cliquez sur "Log In" ou "Sign In"
   - Entrez vos identifiants Sentry
   - Vous serez redirigé automatiquement

### Option B : Navigation Manuelle

1. Allez sur **https://sentry.io**
2. Connectez-vous à votre compte
3. En haut à droite, cliquez sur **"Settings"** (ou l'icône ⚙️)
4. Dans le menu de gauche, cliquez sur **"Integrations"**
5. Dans la liste, cherchez **"GitHub"**
6. Cliquez sur **"GitHub"**

---

## 🔧 ÉTAPE 2 : Installer l'Intégration GitHub

### Si vous voyez un bouton "Install" ou "Add Installation"

1. **Cliquez sur "Install"** (ou "Add Installation" ou "Configure")
2. Vous serez redirigé vers GitHub pour autoriser l'accès

### Si vous voyez "Not Installed" ou rien

1. **Cliquez sur "Install"** ou **"Add Installation"**
2. Un popup ou une nouvelle page s'ouvre

### Si l'intégration est déjà partiellement installée

1. Vous verrez peut-être "Configure" ou "Manage"
2. **Cliquez dessus** pour accéder à la configuration

---

## 🔐 ÉTAPE 3 : Autoriser Sentry sur GitHub

**⚠️ IMPORTANT** : Cette étape se fait sur GitHub, pas sur Sentry.

### Sur la page GitHub qui s'est ouverte

1. **Lisez les permissions demandées** :
   - Repository access (read)
   - Commit status (write)
   - Pull requests (read)
   - Issues (write)

2. **Sélectionnez l'organisation ou le compte** :
   - Si vous voyez une liste déroulante "Select account or organization"
   - **Sélectionnez "torp-fr"** (ou votre organisation GitHub)

3. **Choisissez les repositories** :
   - **Option A** : "All repositories" (si vous voulez donner accès à tout)
   - **Option B** : "Only select repositories" (recommandé)
     - Cochez la case à côté de **"torp-25"**
     - Ou tapez "torp-25" dans la recherche

4. **Cliquez sur "Install"** (ou "Authorize" selon la version de GitHub)

5. **Vous serez redirigé vers Sentry automatiquement**

---

## ⚙️ ÉTAPE 4 : Configurer le Repository dans Sentry

**Vous êtes maintenant de retour sur la page Sentry.**

### Si vous voyez une liste de repositories

1. **Cherchez "torp-fr/torp-25"** dans la liste
2. **Cliquez sur "Configure"** à côté du repository
   - Ou cliquez directement sur le repository

### Si vous voyez un formulaire de configuration

1. **Repository** :
   - Sélectionnez `torp-fr/torp-25` dans la liste déroulante
   - Ou entrez `torp-fr/torp-25` manuellement

2. **Options à activer** :
   - ☑️ **"Suspect Commits"** - Identifie les commits problématiques
   - ☑️ **"Release Tracking"** - Associe les erreurs aux releases Git

3. **Optionnel** :
   - ☐ **"Create Issues Automatically"** - Crée des issues GitHub automatiquement
   - (Vous pouvez laisser cette option désactivée pour l'instant)

4. **Cliquez sur "Save"** ou **"Save Changes"**

---

## ✅ ÉTAPE 5 : Vérifier l'Installation

### Vérification dans Sentry

1. **Retournez sur la page d'intégrations** :
   - https://sentry.io/settings/o4510290746146816/integrations/github/

2. **Vous devriez voir** :
   - ✅ Status : "Installed" ou "Configured"
   - ✅ Repository : `torp-fr/torp-25` listé
   - ✅ Options actives : Suspect Commits, Release Tracking

### Vérification dans GitHub

1. Allez sur **https://github.com/settings/installations**
2. **Cherchez "Sentry"** dans la liste
3. **Vous devriez voir** :
   - ✅ "Sentry" installé
   - ✅ Repository `torp-25` sélectionné

---

## 🧪 ÉTAPE 6 : Tester l'Intégration

### 1. Générer une Erreur de Test

**Option A - Production** :

```bash
curl https://torp-platform.vercel.app/api/test-sentry-complete
```

**Option B - Interface Web** :

1. Allez sur : https://torp-platform.vercel.app/test-sentry-complete
2. Cliquez sur **"Lancer Test Complet"**

### 2. Vérifier dans Sentry

1. **Ouvrez le dashboard Sentry** :
   - https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/

2. **Attendez 10-30 secondes**

3. **Rafraîchissez la page** (F5)

4. **Ouvrez la nouvelle issue** qui vient d'apparaître

5. **Vérifiez que vous voyez** :
   - ✅ Section **"Suspect Commits"** avec des commits listés
   - ✅ Section **"Code Context"** avec des liens vers GitHub
   - ✅ Liens GitHub cliquables vers les fichiers

---

## 🐛 Problèmes Courants et Solutions

### ❌ Problème 1 : "Install" ne fonctionne pas

**Solution** :

1. Vérifiez que vous êtes connecté à Sentry
2. Vérifiez que vous avez les droits administrateur sur l'organisation Sentry
3. Essayez avec un autre navigateur ou en navigation privée
4. Videz le cache du navigateur (Ctrl+Shift+Delete)

### ❌ Problème 2 : GitHub ne redirige pas vers Sentry

**Solution** :

1. Vérifiez que vous avez bien cliqué sur "Install" dans GitHub
2. Retournez manuellement sur : https://sentry.io/settings/o4510290746146816/integrations/github/
3. Vérifiez que l'installation est visible dans la liste

### ❌ Problème 3 : Repository "torp-25" non visible

**Solutions** :

1. **Vérifiez les permissions GitHub** :
   - Allez sur https://github.com/settings/installations
   - Trouvez "Sentry"
   - Cliquez sur "Configure"
   - Vérifiez que `torp-25` est sélectionné
   - Si non, ajoutez-le et sauvegardez

2. **Vérifiez l'accès au repository** :
   - Allez sur https://github.com/torp-fr/torp-25
   - Assurez-vous que vous avez les droits de lecture
   - Si vous êtes propriétaire/admin, vous avez automatiquement les droits

### ❌ Problème 4 : "Not Installed" persiste après installation

**Solution** :

1. Attendez 1-2 minutes (synchronisation)
2. Rafraîchissez la page (F5)
3. Déconnectez-vous et reconnectez-vous à Sentry
4. Vérifiez dans GitHub que l'installation est bien là

### ❌ Problème 5 : Suspect Commits ne s'affiche pas

**Solutions** :

1. Vérifiez que "Suspect Commits" est activé dans les options
2. Attendez quelques minutes (première synchronisation peut prendre du temps)
3. Créez une nouvelle erreur de test
4. Vérifiez que les commits sont bien dans le repository GitHub

---

## 📞 Besoin d'Aide ?

### Documentation Sentry

- **Guide officiel** : https://docs.sentry.io/product/integrations/source-code-mgmt/github/
- **Support Sentry** : https://help.sentry.io/

### Vérifier la Configuration Actuelle

**Dans Sentry** :

1. https://sentry.io/settings/o4510290746146816/integrations/github/
2. Vérifiez le status de l'intégration

**Dans GitHub** :

1. https://github.com/settings/installations
2. Vérifiez que Sentry est installé

---

## ✅ Checklist Finale

- [ ] Étape 1 : Page d'intégration GitHub ouverte dans Sentry
- [ ] Étape 2 : Bouton "Install" cliqué
- [ ] Étape 3 : Autorisation GitHub effectuée
- [ ] Étape 4 : Repository `torp-fr/torp-25` configuré
- [ ] Étape 5 : Installation vérifiée (visible dans Sentry et GitHub)
- [ ] Étape 6 : Test effectué et Suspect Commits visible dans une issue

---

## 🎯 Une fois l'Intégration Activée

L'intégration fonctionnera automatiquement :

- ✅ **Suspect Commits** : Identifie les commits qui ont introduit des erreurs
- ✅ **Code Context** : Affiche le code source avec liens GitHub
- ✅ **Release Tracking** : Associe les erreurs aux tags Git
- ✅ **Linked Issues** : (Si activé) Crée des issues GitHub automatiquement

**Vous n'avez rien d'autre à configurer, tout est automatique !**

---

**💡 Astuce** : Si vous êtes bloqué à une étape précise, notez exactement ce que vous voyez à l'écran et où vous êtes bloqué. Cela aidera à identifier le problème.

**📝 Note** : L'intégration nécessite une autorisation OAuth de sécurité GitHub. C'est normal que cela se fasse via des redirections entre Sentry et GitHub.
