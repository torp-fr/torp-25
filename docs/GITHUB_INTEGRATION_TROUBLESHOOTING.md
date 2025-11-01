# 🔧 Dépannage - Intégration GitHub Sentry

**Date**: 1er Novembre 2025  
**Guide de résolution des problèmes courants**

---

## 🚨 Problèmes les Plus Fréquents

### 1. "Install" ne fait rien ou page blanche

#### Causes possibles

- Bloqueur de popups actif
- Problème de cache navigateur
- Problème de session Sentry

#### Solutions

**Solution 1 : Vérifier les popups**

1. Vérifiez que votre navigateur autorise les popups pour `sentry.io`
2. Désactivez temporairement les bloqueurs de pub (AdBlock, etc.)

**Solution 2 : Navigation privée**

1. Ouvrez une fenêtre de navigation privée (Ctrl+Shift+N)
2. Connectez-vous à Sentry
3. Réessayez l'installation

**Solution 3 : Vider le cache**

1. Appuyez sur Ctrl+Shift+Delete
2. Cochez "Cookies et données de sites"
3. Cliquez sur "Effacer les données"
4. Reconnectez-vous à Sentry

**Solution 4 : Navigateur différent**

- Essayez avec Chrome, Firefox, ou Edge
- Parfois un navigateur peut avoir des problèmes spécifiques

---

### 2. GitHub ne redirige pas vers Sentry

#### Causes possibles

- Autorisation partielle sur GitHub
- Problème de redirection OAuth

#### Solutions

**Solution 1 : Vérifier l'autorisation GitHub**

1. Allez sur https://github.com/settings/installations
2. Cherchez "Sentry"
3. Si présent, cliquez sur "Configure"
4. Vérifiez que `torp-25` est sélectionné
5. Sauvegardez

**Solution 2 : Réinstaller depuis GitHub**

1. Allez sur https://github.com/settings/installations
2. Trouvez "Sentry"
3. Cliquez sur "Configure"
4. Cliquez sur "Uninstall"
5. Retournez sur Sentry et réessayez l'installation

**Solution 3 : Retour manuel**

1. Après avoir autorisé sur GitHub, retournez manuellement sur :
   ```
   https://sentry.io/settings/o4510290746146816/integrations/github/
   ```
2. Vérifiez si l'installation est maintenant visible

---

### 3. Repository "torp-25" non visible dans la liste

#### Causes possibles

- Repository non sélectionné dans GitHub
- Permissions GitHub insuffisantes
- Repository dans une organisation différente

#### Solutions

**Solution 1 : Vérifier les permissions GitHub**

1. Allez sur https://github.com/torp-fr/torp-25
2. Vérifiez que vous avez les droits de **lecture** minimum
3. Si vous êtes propriétaire/admin, vous avez automatiquement les droits

**Solution 2 : Réinstaller avec sélection explicite**

1. Allez sur https://github.com/settings/installations
2. Trouvez "Sentry"
3. Cliquez sur "Configure"
4. Si vous voyez "All repositories", changez pour "Only select repositories"
5. Cochez **"torp-25"** dans la liste
6. Cliquez sur "Save"
7. Retournez sur Sentry et vérifiez

**Solution 3 : Vérifier l'organisation GitHub**

1. Assurez-vous que `torp-25` est bien dans l'organisation `torp-fr`
2. Vérifiez l'URL : https://github.com/torp-fr/torp-25
3. Si c'est sous un autre compte, sélectionnez le bon compte lors de l'autorisation

---

### 4. "Not Installed" persiste après installation

#### Causes possibles

- Synchronisation en cours
- Problème de cache
- Session expirée

#### Solutions

**Solution 1 : Attendre la synchronisation**

1. Attendez **2-3 minutes** après l'installation
2. Rafraîchissez la page Sentry (F5)
3. Vérifiez à nouveau

**Solution 2 : Vérifier dans GitHub**

1. Allez sur https://github.com/settings/installations
2. Vérifiez que "Sentry" est bien dans la liste
3. Si oui, le problème est juste d'affichage côté Sentry
4. Essayez de vous déconnecter/reconnecter à Sentry

**Solution 3 : Forcer la synchronisation**

1. Dans Sentry, allez sur : https://sentry.io/settings/o4510290746146816/integrations/github/
2. Cherchez un bouton "Refresh" ou "Sync"
3. Ou déconnectez-vous/reconnectez-vous

---

### 5. Suspect Commits ne s'affiche pas dans les issues

#### Causes possibles

- Option non activée
- Première synchronisation en cours
- Commits pas encore analysés

#### Solutions

**Solution 1 : Vérifier l'activation**

1. Allez sur https://sentry.io/settings/o4510290746146816/integrations/github/
2. Cliquez sur "Configure" à côté de `torp-fr/torp-25`
3. Vérifiez que **"Suspect Commits"** est coché ✅
4. Sauvegardez si nécessaire

**Solution 2 : Créer une nouvelle erreur**

1. Les Suspect Commits peuvent prendre quelques minutes pour la première fois
2. Générez une nouvelle erreur de test :
   ```bash
   curl https://torp-platform.vercel.app/api/test-sentry-complete
   ```
3. Attendez 2-3 minutes
4. Ouvrez la nouvelle issue dans Sentry
5. Vérifiez la section "Suspect Commits"

**Solution 3 : Vérifier les commits dans GitHub**

1. Allez sur https://github.com/torp-fr/torp-25/commits
2. Vérifiez qu'il y a bien des commits récents
3. Sentry ne peut analyser que les commits qui existent dans GitHub

---

### 6. Erreur "Access Denied" ou "Forbidden"

#### Causes possibles

- Droits administrateur manquants
- Organisation Sentry différente
- Problème de permissions GitHub

#### Solutions

**Solution 1 : Vérifier les droits Sentry**

1. Vérifiez que vous êtes **Owner** ou **Admin** de l'organisation Sentry
2. Pour vérifier : https://sentry.io/settings/o4510290746146816/members/
3. Votre rôle doit être "Owner" ou "Admin"

**Solution 2 : Vérifier l'organisation**

1. Vérifiez que vous êtes dans la bonne organisation : `o4510290746146816`
2. L'URL doit contenir : `/organizations/o4510290746146816/`

**Solution 3 : Vérifier les droits GitHub**

1. Allez sur https://github.com/torp-fr/torp-25/settings/access
2. Vérifiez que vous avez les droits **Admin** ou **Maintain** sur le repository

---

### 7. L'intégration semble installée mais rien ne fonctionne

#### Diagnostic

**Étape 1 : Vérifier dans Sentry**

1. https://sentry.io/settings/o4510290746146816/integrations/github/
2. Notez exactement ce que vous voyez (status, repository listé, etc.)

**Étape 2 : Vérifier dans GitHub**

1. https://github.com/settings/installations
2. Vérifiez que Sentry est installé
3. Vérifiez que `torp-25` est sélectionné

**Étape 3 : Tester avec une erreur réelle**

1. Générez une erreur : https://torp-platform.vercel.app/api/test-sentry-complete
2. Attendez 30 secondes
3. Ouvrez l'issue dans Sentry
4. Vérifiez si vous voyez "Suspect Commits" ou "Code Context"

#### Solutions

**Si l'intégration est installée mais inactive** :

1. Désinstallez complètement depuis GitHub
2. Réinstallez en suivant le guide pas à pas
3. Assurez-vous de sélectionner explicitement `torp-25` dans GitHub

**Si certaines fonctionnalités ne marchent pas** :

1. Vérifiez les options activées dans Sentry
2. Certaines fonctionnalités peuvent prendre quelques heures pour la première synchronisation

---

## 🔍 Vérifications Systématiques

### Checklist de Diagnostic

1. **Dans Sentry** :
   - [ ] Je suis connecté à Sentry
   - [ ] Je suis dans l'organisation `o4510290746146816`
   - [ ] J'ai les droits Owner/Admin
   - [ ] La page d'intégration GitHub s'ouvre
   - [ ] Je vois un bouton "Install" ou "Configure"

2. **Dans GitHub** :
   - [ ] Je suis connecté à GitHub
   - [ ] J'ai accès au repository `torp-fr/torp-25`
   - [ ] Je peux voir les commits dans GitHub
   - [ ] L'installation Sentry apparaît dans https://github.com/settings/installations

3. **Configuration** :
   - [ ] Repository `torp-fr/torp-25` est sélectionné dans GitHub
   - [ ] "Suspect Commits" est activé dans Sentry
   - [ ] "Release Tracking" est activé dans Sentry

---

## 📞 Support Supplémentaire

### Ressources Officielles

- **Documentation Sentry GitHub** : https://docs.sentry.io/product/integrations/source-code-mgmt/github/
- **Support Sentry** : https://help.sentry.io/
- **GitHub Apps Documentation** : https://docs.github.com/en/apps

### Informations à Fournir si Besoin d'Aide

Si vous contactez le support, fournissez :

1. Le message d'erreur exact (copier-coller)
2. À quelle étape vous êtes bloqué
3. Ce que vous voyez à l'écran (description)
4. Les URLs que vous avez visitées
5. Les captures d'écran (si possible)

---

**💡 Conseil** : Si vous êtes complètement bloqué, essayez de désinstaller complètement l'intégration depuis GitHub et Sentry, puis réinstallez en suivant le guide pas à pas depuis le début.
