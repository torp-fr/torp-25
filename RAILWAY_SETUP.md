# 🚂 Configuration Railway pour TORP

Railway est une excellente solution pour héberger la base de données PostgreSQL de TORP.

## 📋 Prérequis

- ✅ Compte Railway (gratuit : https://railway.app)
- ✅ Projet TORP sur GitHub
- ✅ Projet Vercel configuré

---

## 🗄️ Étape 1 : Créer la Base de Données PostgreSQL

### 1.1 Accéder à Railway

1. Allez sur **https://railway.app**
2. Connectez-vous avec votre compte
3. Cliquez sur **"New Project"**

### 1.2 Déployer PostgreSQL

1. Sélectionnez **"Deploy PostgreSQL"** (ou "Provision PostgreSQL")
2. Railway va créer une instance PostgreSQL automatiquement
3. Attendez quelques secondes (déploiement rapide)

### 1.3 Récupérer les Credentials

Une fois la DB créée :

1. Cliquez sur votre base de données PostgreSQL dans le projet
2. Allez dans l'onglet **"Connect"** ou **"Variables"**
3. Vous verrez plusieurs variables, notamment :
   - `DATABASE_URL` (c'est celle-ci qu'on veut !)
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

4. **Copiez la valeur de `DATABASE_URL`**
   - Format : `postgresql://username:password@host:port/database`
   - Exemple : `postgresql://postgres:AbCd1234@containers-us-west-123.railway.app:5432/railway`

---

## 🔗 Étape 2 : Connecter Railway à Vercel

### 2.1 Ajouter DATABASE_URL dans Vercel

1. Allez sur **https://vercel.com/dashboard**
2. Sélectionnez votre projet **torp-25**
3. Cliquez sur **Settings** → **Environment Variables**
4. Cliquez sur **"Add New"**

Ajoutez cette variable :

```
Name:  DATABASE_URL
Value: postgresql://username:password@host:port/database
       (collez la valeur copiée depuis Railway)

Environments: ☑ Production ☑ Preview ☑ Development
```

5. Cliquez sur **"Save"**

### 2.2 Ajouter les Autres Variables Essentielles

Ajoutez également ces variables **obligatoires** :

#### Auth0

```bash
Name:  AUTH0_SECRET
Value: [générez avec: openssl rand -base64 32]

Name:  AUTH0_BASE_URL
Value: https://torp-25.vercel.app  # ou votre URL Vercel

Name:  AUTH0_ISSUER_BASE_URL
Value: https://votre-tenant.auth0.com

Name:  AUTH0_CLIENT_ID
Value: votre-client-id

Name:  AUTH0_CLIENT_SECRET
Value: votre-client-secret
```

#### Application

```bash
Name:  NEXT_PUBLIC_APP_URL
Value: https://torp-25.vercel.app  # ou votre URL Vercel

Name:  NODE_ENV
Value: production
```

---

## 🔧 Étape 3 : Initialiser la Base de Données

### 3.1 Installer Prisma CLI (si pas déjà fait)

Sur votre machine locale :

```bash
npm install -g prisma
```

### 3.2 Configurer .env Local

Créez un fichier `.env` à la racine du projet :

```bash
# Copiez la DATABASE_URL de Railway
DATABASE_URL="postgresql://username:password@host:port/database"
```

### 3.3 Exécuter les Migrations

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers la DB Railway
npx prisma db push

# Vérifier que tout fonctionne
npx prisma studio
```

Cela va :
- ✅ Créer toutes les tables (users, devis, torp_scores, etc.)
- ✅ Créer les relations et contraintes
- ✅ Initialiser la base de données

---

## 🚀 Étape 4 : Redéployer sur Vercel

### 4.1 Déclencher un Nouveau Déploiement

1. Retournez sur **Vercel → Deployments**
2. Cliquez sur **"Redeploy"** sur le dernier build
3. Ou faites un nouveau commit/push pour déclencher un build

### 4.2 Vérifier le Build

Le build devrait maintenant :

```bash
✓ Installing dependencies
✓ Prisma generated successfully
✓ Building Next.js application
✓ Build completed
✓ Deploying...
✓ Ready! https://torp-25.vercel.app
```

---

## ✅ Étape 5 : Tester l'Application

### 5.1 Tester l'API Health

```bash
curl https://torp-25.vercel.app/api/health
```

Devrait retourner :
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T...",
  "version": "1.0.0",
  "service": "TORP Platform"
}
```

### 5.2 Tester la Landing Page

Visitez : `https://torp-25.vercel.app`

Vous devriez voir la page d'accueil TORP avec :
- ✅ Header et navigation
- ✅ Hero section
- ✅ Fonctionnalités
- ✅ Footer

---

## 🔍 Vérification de la Base de Données

### Via Railway Dashboard

1. Dans Railway, cliquez sur votre PostgreSQL
2. Cliquez sur **"Data"** ou utilisez l'onglet **Query**
3. Exécutez cette requête pour vérifier les tables :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Vous devriez voir :
- `User`
- `UserProfile`
- `CompanyProfile`
- `Document`
- `Devis`
- `TORPScore`
- `Comparison`
- `Subscription`
- `Payment`
- `AnalyticsEvent`

### Via Prisma Studio (Local)

```bash
npx prisma studio
```

Ouvre une interface web pour voir et éditer les données.

---

## 🎨 Architecture Frontend ↔ Backend ↔ Database

```
┌─────────────────────────────────────────────────┐
│         FRONTEND (Vercel)                       │
│  Next.js 15 App Router                          │
│  - Landing Page                                 │
│  - Dashboard B2C/B2B                            │
│  - Upload de documents                          │
└─────────────────────────────────────────────────┘
                    ↓ API Routes
┌─────────────────────────────────────────────────┐
│         BACKEND (Vercel Serverless)             │
│  - /api/upload   (documents)                    │
│  - /api/devis    (CRUD devis)                   │
│  - /api/score    (TORP-Score)                   │
│  - /api/health   (health check)                 │
└─────────────────────────────────────────────────┘
                    ↓ Prisma ORM
┌─────────────────────────────────────────────────┐
│         DATABASE (Railway)                      │
│  PostgreSQL 15                                  │
│  - 10 Tables principales                        │
│  - Relations et contraintes                     │
│  - Indexation optimisée                         │
└─────────────────────────────────────────────────┘
```

**Tout est déjà implémenté !** Il suffit de connecter Railway.

---

## 🔒 Sécurité Railway

### Connexions Sécurisées

✅ Railway utilise SSL/TLS automatiquement
✅ Les credentials sont dans des variables d'environnement
✅ Pas d'accès public direct à la DB

### Backups Automatiques

Railway fait des backups automatiques, mais pour la production :

1. Dans Railway → PostgreSQL → Settings
2. Activez les backups si disponible
3. Ou configurez des snapshots manuels

---

## 💰 Limites Railway (Plan Gratuit)

| Ressource | Limite Gratuite | Notes |
|-----------|----------------|-------|
| Déploiements | Illimité | ✅ Parfait pour développement |
| Exécution | $5 crédit/mois | Environ 500h/mois |
| RAM | 512MB-1GB | Suffisant pour PostgreSQL |
| Storage | 1GB | Pour la DB |
| Réseau | Illimité | ✅ |

💡 **Pour TORP en développement, c'est largement suffisant !**

---

## 🚨 Dépannage

### Erreur : "Connection timeout"

**Cause** : Railway DB pas accessible depuis Vercel

**Solution** :
1. Vérifiez que DATABASE_URL est correcte dans Vercel
2. Railway n'a pas de firewall, ça devrait fonctionner

### Erreur : "Prisma generate failed"

**Solution** :
```bash
# Localement
rm -rf node_modules
npm install
npx prisma generate
```

### Erreur : "Table doesn't exist"

**Solution** :
```bash
# Re-push le schéma
npx prisma db push --force-reset
```

---

## 📊 Monitoring Railway

### Voir l'Utilisation

1. Railway Dashboard → Project
2. Vous verrez l'utilisation CPU, RAM, Network
3. Logs en temps réel disponibles

### Alertes

Railway peut envoyer des alertes si :
- ❌ Service down
- ⚠️ Crédits épuisés
- 📊 RAM/CPU élevé

---

## 🎯 Checklist Complète

- [ ] Créer DB PostgreSQL sur Railway
- [ ] Copier DATABASE_URL
- [ ] Ajouter DATABASE_URL dans Vercel
- [ ] Ajouter variables Auth0 dans Vercel
- [ ] Exécuter `npx prisma db push` localement
- [ ] Redéployer sur Vercel
- [ ] Tester `/api/health`
- [ ] Tester la landing page
- [ ] Vérifier les tables dans Railway

---

## ✅ Résultat Final

Après ces étapes, vous aurez :

✅ **Frontend** : Next.js déployé sur Vercel
✅ **Backend** : API routes serverless sur Vercel
✅ **Database** : PostgreSQL sur Railway
✅ **Connexion** : Prisma ORM reliant tout

**L'application TORP sera entièrement fonctionnelle !** 🎉

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Vercel (Function logs)
2. Vérifiez les logs Railway (Database logs)
3. Testez la connexion DB localement avec Prisma Studio

---

**🚀 Commencez par créer la DB PostgreSQL sur Railway, puis suivez ce guide !**
