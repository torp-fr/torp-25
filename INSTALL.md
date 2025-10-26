# 🚀 Guide d'Installation TORP

Ce guide vous accompagne dans l'installation et la configuration de la plateforme TORP.

## ⚙️ Prérequis

Avant de commencer, assurez-vous d'avoir installé:

- **Node.js** 20+ ([télécharger](https://nodejs.org/))
- **PostgreSQL** 15+ ([télécharger](https://www.postgresql.org/download/))
- **Redis** 7+ ([télécharger](https://redis.io/download))
- **Git** ([télécharger](https://git-scm.com/downloads))

Vous aurez également besoin de:
- Un compte **AWS** (pour S3 et Rekognition)
- Un compte **Auth0** (pour l'authentification)
- Un compte **Stripe** (pour les paiements)

## 📦 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/torp-fr/torp-25.git
cd torp-25
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande installera toutes les dépendances listées dans `package.json`.

### 3. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet:

```bash
cp .env.example .env
```

Éditez le fichier `.env` et remplissez toutes les variables nécessaires:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/torp"

# Auth0
AUTH0_SECRET='générer-une-clé-secrète-de-32-caractères-minimum'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://votre-tenant.auth0.com'
AUTH0_CLIENT_ID='votre-client-id'
AUTH0_CLIENT_SECRET='votre-client-secret'

# AWS
AWS_REGION='eu-west-3'
AWS_ACCESS_KEY_ID='votre-access-key'
AWS_SECRET_ACCESS_KEY='votre-secret-key'
AWS_S3_BUCKET_NAME='torp-documents'

# Stripe
STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_SECRET_KEY='sk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'

# Application
NEXT_PUBLIC_APP_URL='http://localhost:3000'
NODE_ENV='development'

# Redis
REDIS_URL='redis://localhost:6379'
```

## 🗄️ Configuration de la base de données

### 1. Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE torp;

# Créer un utilisateur (optionnel)
CREATE USER torp_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE torp TO torp_user;

# Quitter psql
\q
```

### 2. Exécuter les migrations Prisma

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# (Optionnel) Ouvrir Prisma Studio pour visualiser les données
npm run db:studio
```

## ☁️ Configuration AWS

### 1. Créer un bucket S3

1. Connectez-vous à la console AWS
2. Accédez à S3
3. Créez un nouveau bucket nommé `torp-documents` (ou le nom de votre choix)
4. Configurez les permissions appropriées
5. Notez le nom du bucket pour votre fichier `.env`

### 2. Configurer IAM

Créez un utilisateur IAM avec les permissions suivantes:
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `rekognition:DetectText`

Récupérez les credentials (Access Key ID et Secret Access Key).

## 🔐 Configuration Auth0

### 1. Créer une application Auth0

1. Connectez-vous à [Auth0](https://auth0.com)
2. Créez une nouvelle application (type: Regular Web Application)
3. Configurez les URLs autorisées:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`

### 2. Récupérer les credentials

Dans les paramètres de votre application, récupérez:
- Domain (AUTH0_ISSUER_BASE_URL)
- Client ID (AUTH0_CLIENT_ID)
- Client Secret (AUTH0_CLIENT_SECRET)

Générez une clé secrète pour AUTH0_SECRET:
```bash
openssl rand -base64 32
```

## 💳 Configuration Stripe

### 1. Créer un compte Stripe

1. Créez un compte sur [Stripe](https://stripe.com)
2. Accédez aux clés API (mode test)
3. Récupérez:
   - Publishable key
   - Secret key

### 2. Configurer les webhooks (optionnel pour le dev)

Pour recevoir les événements Stripe localement:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 🚀 Démarrer l'application

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Mode production

```bash
# Build de l'application
npm run build

# Démarrer le serveur
npm run start
```

## ✅ Vérification de l'installation

### 1. Vérifier la santé de l'API

```bash
curl http://localhost:3000/api/health
```

Vous devriez recevoir:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T...",
  "version": "1.0.0",
  "service": "TORP Platform"
}
```

### 2. Vérifier la base de données

```bash
npm run db:studio
```

Cela ouvrira Prisma Studio où vous pourrez visualiser vos tables.

### 3. Tester l'upload de fichiers

1. Accédez à [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Essayez d'uploader un fichier PDF de test
3. Vérifiez que le fichier apparaît dans votre bucket S3

## 🔧 Dépannage

### Erreur de connexion à PostgreSQL

- Vérifiez que PostgreSQL est démarré: `pg_ctl status`
- Vérifiez votre `DATABASE_URL` dans `.env`
- Assurez-vous que le port 5432 est accessible

### Erreur de connexion à Redis

- Démarrez Redis: `redis-server`
- Vérifiez que Redis écoute sur le port 6379: `redis-cli ping`

### Erreur Prisma

Si vous rencontrez des erreurs Prisma:
```bash
# Nettoyer et réinstaller
rm -rf node_modules
rm -rf .next
npm install
npm run db:generate
```

### Erreur de compilation TypeScript

```bash
# Vérifier les erreurs
npm run typecheck

# Nettoyer le cache Next.js
rm -rf .next
npm run dev
```

## 📚 Commandes utiles

```bash
# Développement
npm run dev                 # Démarrer en mode dev
npm run build              # Build pour production
npm run start              # Démarrer en production

# Base de données
npm run db:generate        # Générer le client Prisma
npm run db:migrate         # Créer/appliquer migrations
npm run db:push            # Push schema sans migration
npm run db:studio          # Ouvrir Prisma Studio

# Code quality
npm run lint               # Linter le code
npm run lint:fix           # Corriger automatiquement
npm run format             # Formater avec Prettier
npm run typecheck          # Vérifier TypeScript

# Tests
npm run test               # Lancer les tests
npm run test:ui            # Interface de test
npm run test:coverage      # Coverage des tests
```

## 🎯 Prochaines étapes

Une fois l'installation terminée:

1. ✅ Créez votre premier compte utilisateur
2. ✅ Uploadez un devis de test
3. ✅ Lancez une analyse TORP-Score
4. ✅ Explorez le dashboard
5. ✅ Consultez la documentation API

## 🆘 Support

Si vous rencontrez des problèmes:

- 📖 Consultez le [README.md](./README.md)
- 🐛 Ouvrez une issue sur GitHub
- 📧 Contactez support@torp.fr
- 💬 Rejoignez notre Slack (lien à venir)

## 📝 Notes importantes

⚠️ **Mode développement uniquement**

Ce guide est pour l'environnement de développement. Pour la production:
- Utilisez des clés API de production
- Configurez HTTPS/SSL
- Activez les sauvegardes de base de données
- Configurez un CDN (CloudFront)
- Mettez en place la surveillance (Sentry)

---

Bonne installation ! 🚀
