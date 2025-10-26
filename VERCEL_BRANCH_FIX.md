# 🔧 SOLUTION : Déployer la Bonne Branche sur Vercel

## ❌ Problème Actuel

Vercel déploie la branche `main` qui contient le code initial Next.js.
Notre code TORP complet est sur : `claude/torp-quote-analysis-app-011CUVsv2dbN9iK2y3Gyz3pt`

## ✅ SOLUTION IMMÉDIATE (2 minutes)

### Changer la Branche de Déploiement dans Vercel

1. **Allez sur Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Sélectionnez votre projet** `torp-25`

3. **Cliquez sur Settings**

4. **Dans le menu gauche, cliquez sur "Git"**

5. **Trouvez "Production Branch"**
   - Actuellement : `main`
   - **Changez en** : `claude/torp-quote-analysis-app-011CUVsv2dbN9iK2y3Gyz3pt`

6. **Cliquez sur "Save"**

7. **Redéployez**
   - Retournez à l'onglet "Deployments"
   - Le prochain déploiement utilisera la bonne branche
   - Ou cliquez "Redeploy" pour forcer maintenant

---

## 🎯 Résultat Attendu

Après ce changement, Vercel déploiera :

✅ **La branche avec tout le code TORP** (au lieu du template vide)
✅ Next.js 15.2.3 (au lieu de 16.0.0)
✅ Landing page TORP complète
✅ API routes fonctionnelles
✅ Toutes les configurations optimisées

---

## 📸 Localisation dans Vercel

```
Dashboard
  → Projet torp-25
    → Settings
      → Git (menu gauche)
        → Production Branch
          → Changez de "main" à "claude/torp-quote-analysis-app-011CUVsv2dbN9iK2y3Gyz3pt"
          → Save
```

---

## 🔄 Alternative : Merger dans Main (si vous avez les droits)

Si vous êtes admin du repo et pouvez désactiver la protection :

### Via GitHub Interface

1. Allez sur **github.com/torp-fr/torp-25**
2. Cliquez sur **"Pull requests"** → **"New pull request"**
3. **Base** : `main`
4. **Compare** : `claude/torp-quote-analysis-app-011CUVsv2dbN9iK2y3Gyz3pt`
5. Créez et mergez la PR

### Via Settings (désactiver protection)

1. GitHub repo → **Settings** → **Branches**
2. Trouvez la règle de protection pour `main`
3. Désactivez temporairement ou ajoutez-vous comme exception
4. Push le code
5. Réactivez la protection

---

## 💡 Recommandation

**La solution la plus rapide** : Changer la branche de production dans Vercel

Ça prend 30 secondes et vous évite de gérer les protections GitHub.

---

## ⚠️ Note Importante

Une fois Vercel configuré sur la bonne branche :

- ✅ Chaque push sur `claude/torp-quote-analysis-app-011CUVsv2dbN9iK2y3Gyz3pt` déclenchera un build
- ✅ Le site affichera le vrai TORP (pas le template)
- ✅ Vous pourrez tester toutes les fonctionnalités

Plus tard, quand tout sera testé, vous pourrez merger dans `main` via une PR.

---

## 🚀 Action Immédiate

**Allez sur Vercel → Settings → Git → Production Branch → Changez pour notre branche !**
