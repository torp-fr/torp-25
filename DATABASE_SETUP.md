# 🗄️ Configuration de la Base de Données TORP

Guide complet pour configurer et migrer la base de données PostgreSQL sur Railway.

## ✅ Prérequis

- ✅ Compte Railway créé
- ✅ Base PostgreSQL provisionnée sur Railway
- ✅ `DATABASE_URL` copié depuis Railway
- ✅ Variables d'environnement configurées dans Vercel

## 📋 Étapes de Migration

### Option 1 : Via Script Bash (Recommandé)

1. **Définir DATABASE_URL localement** :
   ```bash
   export DATABASE_URL='postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:5432/railway'
   ```

2. **Exécuter le script de migration** :
   ```bash
   ./scripts/migrate-database.sh
   ```

3. **Vérifier le succès** :
   - Vous devriez voir "✅ Migrations appliquées avec succès !"
   - 10 tables doivent être créées

### Option 2 : Via Prisma CLI

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Définir DATABASE_URL** :
   ```bash
   export DATABASE_URL='votre-database-url-railway'
   ```

3. **Appliquer les migrations** :
   ```bash
   npx prisma migrate deploy
   ```

4. **Générer Prisma Client** :
   ```bash
   npx prisma generate
   ```

## 📊 Tables Créées

Après migration, votre base de données contient :

| Table | Description | Lignes clés |
|-------|-------------|-------------|
| `users` | Utilisateurs de la plateforme | email, role, auth_provider |
| `user_profiles` | Profils utilisateurs | first_name, last_name, phone |
| `company_profiles` | Profils entreprises | company_name, siret, certifications |
| `documents` | Documents uploadés | file_url, upload_status, ocr_status |
| `devis` | Devis analysés | extracted_data, total_amount |
| `torp_scores` | Scores TORP calculés | score_value, score_grade, breakdown |
| `comparisons` | Comparaisons de devis | devis_ids, comparison_data |
| `subscriptions` | Abonnements | plan_type, status, stripe_subscription_id |
| `payments` | Paiements | amount, status, stripe_payment_intent_id |
| `analytics_events` | Événements analytics | event_type, properties |

## 🔍 Vérification de la Migration

### Via Prisma Studio

Ouvrir l'interface graphique pour explorer la base :

```bash
export DATABASE_URL='votre-url'
npx prisma studio
```

Accédez à `http://localhost:5555` pour voir vos tables.

### Via psql (Railway CLI)

1. **Installer Railway CLI** :
   ```bash
   npm i -g @railway/cli
   ```

2. **Se connecter** :
   ```bash
   railway login
   railway link
   ```

3. **Ouvrir psql** :
   ```bash
   railway run psql $DATABASE_URL
   ```

4. **Lister les tables** :
   ```sql
   \dt
   ```

Vous devriez voir toutes les tables créées.

### Via SQL Query

```sql
-- Compter les tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';

-- Lister toutes les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 🧪 Tester la Connexion depuis l'Application

### Test API Health

Vérifiez que l'API fonctionne :

```bash
curl https://votre-domaine.vercel.app/api/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T...",
  "version": "1.0.0",
  "service": "TORP Platform"
}
```

### Test Database Connection

Créer un fichier de test `scripts/test-db.ts` :

```typescript
import { prisma } from '@/lib/db'

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Connexion à la base de données réussie !')

    const userCount = await prisma.user.count()
    console.log(`📊 Nombre d'utilisateurs : ${userCount}`)

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erreur de connexion :', error)
    process.exit(1)
  }
}

testConnection()
```

Exécuter :
```bash
npx tsx scripts/test-db.ts
```

## 🚨 Résolution des Problèmes

### Erreur : "Can't reach database server"

**Cause** : DATABASE_URL incorrecte ou base de données arrêtée

**Solution** :
1. Vérifiez que la base Railway est active
2. Vérifiez le DATABASE_URL copié
3. Testez la connexion : `psql $DATABASE_URL`

### Erreur : "Migration already applied"

**Cause** : Les migrations ont déjà été exécutées

**Solution** : C'est normal ! La base est déjà à jour.

### Erreur : "relation 'users' already exists"

**Cause** : Les tables existent déjà

**Solution** :
```bash
# Réinitialiser la base (ATTENTION : supprime toutes les données)
npx prisma migrate reset --force
```

## 🔄 Prochaines Étapes

Après migration réussie :

1. ✅ **Tester les API Routes** :
   - `/api/health` - Devrait marcher
   - `/api/devis` - Nécessite utilisateur authentifié
   - `/api/score` - Nécessite devis existant

2. ✅ **Créer un utilisateur test** (optionnel) :
   ```typescript
   const user = await prisma.user.create({
     data: {
       email: 'test@torp.fr',
       role: 'CONSUMER',
     }
   })
   ```

3. ✅ **Configurer Auth0** (prochaine étape)

4. ✅ **Configurer AWS S3** pour l'upload de documents

## 📚 Ressources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
- [Schema Prisma TORP](./prisma/schema.prisma)

## 🆘 Support

En cas de problème, vérifiez :
1. La connexion Railway fonctionne
2. Le DATABASE_URL est correct
3. Les variables d'environnement Vercel sont configurées
4. Le déploiement Vercel a réussi avec les nouvelles variables
