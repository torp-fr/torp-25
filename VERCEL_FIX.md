# 🔧 SOLUTION ERREUR VERCEL "Root Directory not found"

## ❌ Problème
```
The specified Root Directory "frontend" does not exist.
Please update your Project Settings.
```

## ✅ Solution Immédiate (OBLIGATOIRE)

Vercel cherche le code dans un dossier `frontend/` qui n'existe pas.
Le code est à la **racine** du projet.

### **VOUS DEVEZ modifier manuellement dans l'interface Vercel** :

### Étape 1 : Accéder aux Paramètres

1. Allez sur **https://vercel.com/dashboard**
2. Trouvez et cliquez sur votre projet **torp-25**
3. Cliquez sur l'onglet **"Settings"** (en haut)

### Étape 2 : Modifier le Root Directory

1. Dans le menu de gauche, cliquez sur **"General"**
2. Scrollez jusqu'à la section **"Root Directory"**
3. Vous verrez actuellement : `frontend`
4. **Cliquez sur "Edit"** (à droite)
5. **Supprimez "frontend"** et laissez le champ **VIDE** ou mettez **`.`** (un point)
6. Cliquez sur **"Save"**

### Étape 3 : Redéployer

1. Retournez à l'onglet **"Deployments"**
2. Sur le dernier déploiement (celui qui a échoué), cliquez sur les **3 points** ⋮
3. Sélectionnez **"Redeploy"**
4. ✅ Le build devrait maintenant fonctionner !

---

## 📸 Captures d'Écran de Référence

### Où trouver "Root Directory" :
```
Dashboard → [Votre Projet] → Settings → General
↓
┌─────────────────────────────────────────┐
│ Root Directory                          │
│ ┌─────────────────────────────────────┐ │
│ │ frontend                     [Edit] │ │  ← Cliquez sur Edit
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Après modification :
```
┌─────────────────────────────────────────┐
│ Root Directory                          │
│ ┌─────────────────────────────────────┐ │
│ │                             [Save]  │ │  ← Laissez vide ou "."
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔍 Vérifications Supplémentaires

### Build & Development Settings

Dans **Settings → Build & Development Settings** :

| Paramètre | Valeur Correcte |
|-----------|----------------|
| Framework Preset | **Next.js** (auto-détecté) |
| Root Directory | **`.`** ou **vide** |
| Build Command | `npm run build` ou vide |
| Output Directory | `.next` ou vide |
| Install Command | `npm install` ou vide |
| Node.js Version | **20.x** |

---

## 🚨 Pourquoi le vercel.json ne suffit pas ?

Le fichier `vercel.json` ne peut **PAS** override le paramètre "Root Directory"
qui est défini dans les **Project Settings** via l'interface web.

Ce paramètre doit être changé **manuellement** dans le dashboard Vercel.

---

## ⚡ Solution Alternative : Recréer le Projet

Si vous ne trouvez pas le paramètre Root Directory :

1. **Supprimer** le projet actuel sur Vercel
2. **Importer** à nouveau depuis GitHub
3. Lors de l'import, **NE PAS** spécifier de Root Directory
4. Vercel détectera automatiquement Next.js à la racine

---

## 📞 Besoin d'Aide ?

Si le problème persiste après avoir changé Root Directory :

1. Vérifiez que vous avez bien cliqué sur **"Save"**
2. **Forcez un nouveau déploiement** (pas juste "Redeploy")
3. Vérifiez les **Environment Variables** (voir INSTALL.md)
4. Consultez les logs de build complets

---

## ✅ Build Réussi - Ce que vous devriez voir :

```bash
✓ Cloning github.com/torp-fr/torp-25
✓ Installing dependencies
✓ Running "npm run build"
✓ Generating Prisma Client
✓ Building Next.js application
✓ Build completed successfully
✓ Deploying to production
✓ Ready! https://torp-25.vercel.app
```

---

**🎯 Action Immédiate : Allez sur Vercel Dashboard → Settings → General → Root Directory → Supprimez "frontend"**
