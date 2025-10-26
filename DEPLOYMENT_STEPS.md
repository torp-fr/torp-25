# 🚀 Étapes de Déploiement Vercel - TORP

## ✅ Problèmes Résolus

- ✅ Root Directory corrigé (était `frontend/`, maintenant à la racine)
- ✅ Conflits de dépendances résolus (Next.js 15.2.3 + Auth0 3.8.0)
- ✅ Configuration `.npmrc` ajoutée avec `legacy-peer-deps`
- ✅ `vercel.json` et `next.config.ts` optimisés

---

## 📝 Variables d'Environnement Requises

### Minimum pour Build Réussi

Le build **nécessite** ces variables pour compiler :

```bash
# Base de données (OBLIGATOIRE même pour build)
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth0 (OBLIGATOIRE)
AUTH0_SECRET=                    # openssl rand -base64 32
AUTH0_BASE_URL=https://your-app.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Option 1 : Build avec DB Factice (pour tester)

Si vous voulez juste tester le build sans vraie DB :

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/torp?schema=public
```

⚠️ **L'app ne fonctionnera pas**, mais le build passera.

### Option 2 : Utiliser une DB Gratuite (Recommandé)

Créez une base de données gratuite sur :

1. **Supabase** (recommandé) - https://supabase.com
   - Créez un projet
   - Allez dans Settings → Database
   - Copiez la Connection String (mode Direct)

2. **Neon** - https://neon.tech
   - Gratuit, PostgreSQL serverless
   - Parfait pour les projets Vercel

3. **Railway** - https://railway.app
   - Gratuit avec limites généreuses

---

## 🔄 Prochain Déploiement

Vercel devrait maintenant :

1. ✅ Cloner le repo sans erreur Root Directory
2. ✅ Installer les dépendances sans conflits
3. ⏳ **Échouer si `DATABASE_URL` manquante**
4. ⏳ **Ou réussir si toutes les variables sont définies**

---

## 📊 Progression Actuelle

| Étape | Status | Action |
|-------|--------|--------|
| Clone repo | ✅ OK | - |
| Root Directory | ✅ Corrigé | Changé dans Settings |
| Install deps | ✅ Corrigé | Next.js 15 + .npmrc |
| Environment vars | ⏳ À faire | Ajouter dans Vercel |
| Build | ⏳ En attente | Après vars |
| Deploy | ⏳ En attente | Après build |

---

## 🎯 Actions Immédiates

### 1. Ajouter Variables d'Environnement

Dans Vercel Dashboard :
1. Settings → Environment Variables
2. Ajoutez au minimum `DATABASE_URL`, `AUTH0_*`, `NEXT_PUBLIC_APP_URL`
3. Sélectionnez tous les environnements (Production, Preview, Development)

### 2. Redéployer

1. Deployments → Latest → ⋮ → Redeploy
2. Attendez le build
3. Vérifiez les logs

---

## 🐛 Erreurs Possibles et Solutions

### Erreur : "Cannot find module '@prisma/client'"

**Solution** :
```bash
# Dans Environment Variables, ajoutez :
SKIP_PRISMA_GENERATE=false
```

Le script `postinstall` dans `package.json` exécute automatiquement `prisma generate`.

### Erreur : "DATABASE_URL is not defined"

**Solution** :
- Ajoutez `DATABASE_URL` dans Environment Variables
- Ou utilisez une URL factice pour tester

### Erreur : Build réussit mais l'app crash

**Probable** : Variables d'environnement manquantes au runtime

**Solution** :
- Vérifiez que toutes les variables sont définies
- Vérifiez les logs de runtime (Function logs)

---

## 🎉 Build Réussi - À Quoi S'Attendre

```bash
✓ Cloning github.com/torp-fr/torp-25
✓ Installing dependencies (legacy-peer-deps)
✓ Running "npm run build"
✓ Generating Prisma Client
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
✓ Build completed successfully
✓ Deploying to production
✓ Ready! https://torp-25.vercel.app
```

---

## 📱 Tester l'Application

Une fois déployée :

1. **Landing Page** : `https://your-app.vercel.app`
2. **Health Check** : `https://your-app.vercel.app/api/health`
3. **Dashboard** : `https://your-app.vercel.app/dashboard`

---

## 🔒 Sécurité Production

Avant de lancer en production :

- [ ] Utiliser des clés Auth0 de production
- [ ] Configurer une vraie base de données avec backups
- [ ] Ajouter les clés Stripe de production
- [ ] Configurer AWS S3 avec credentials de prod
- [ ] Activer HTTPS (automatique sur Vercel)
- [ ] Configurer un nom de domaine personnalisé
- [ ] Ajouter monitoring (Sentry recommandé)

---

## 📞 Support

Si le build échoue :

1. **Copiez les logs complets** de Vercel
2. **Vérifiez** que toutes les variables d'environnement sont définies
3. **Partagez** les logs pour assistance

---

**🎯 Prochaine étape : Ajoutez les variables d'environnement dans Vercel et redéployez !**
