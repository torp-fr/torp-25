# Guide d'Application de la Migration Building Profile Role

## 🚀 Application Rapide

### Étape 1 : Lier Railway (si pas encore fait)

```bash
railway link
```

Sélectionnez votre projet Railway dans la liste.

### Étape 2 : Appliquer la migration

Une fois Railway lié, exécutez :

```bash
railway run npx prisma migrate deploy
```

Ou utilisez le script automatique :

```bash
node scripts/apply-building-profile-role-migration.js
```

## 📋 Méthodes Alternatives

### Option 1 : Via DATABASE_URL locale

Si vous avez la `DATABASE_URL` de Railway :

**Windows PowerShell :**
```powershell
$env:DATABASE_URL="postgresql://user:password@host:port/database"
node scripts/apply-building-profile-role-migration.js
```

**Linux/Mac :**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
node scripts/apply-building-profile-role-migration.js
```

### Option 2 : Via SQL direct

Si Prisma migrate ne fonctionne pas :

```bash
railway run psql $DATABASE_URL -f prisma/migrations/20250131_add_building_profile_role/migration.sql
```

### Option 3 : Via Railway Dashboard

1. Allez sur [Railway Dashboard](https://railway.app)
2. Sélectionnez votre projet
3. Ouvrez la console de la base de données PostgreSQL
4. Collez le contenu de `prisma/migrations/20250131_add_building_profile_role/migration.sql`
5. Exécutez

## ✅ Vérification

Après l'application, vérifiez que la migration a réussi :

```bash
railway run npx prisma migrate status
```

Ou directement en SQL :

```sql
-- Vérifier l'enum
SELECT unnest(enum_range(NULL::building_profile_role));

-- Vérifier les colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'building_profiles' 
  AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data');

-- Vérifier l'index unique
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'building_profiles' 
  AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx';
```

## 🔄 Après la Migration

N'oubliez pas de régénérer le client Prisma :

```bash
npx prisma generate
```

Cela mettra à jour les types TypeScript avec les nouveaux champs `role`, `parentProfileId`, `lotNumber`, et `tenantData`.


