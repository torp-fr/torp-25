# Résolution de la Migration RNB Échouée

Si la migration `20250128_add_rnb_models` a échoué dans Prisma, voici les étapes pour la résoudre :

## Option 1 : Résolution Automatique (Recommandé)

Créer une nouvelle migration qui résout l'état :

```bash
# La migration 20250128_fix_rnb_migration devrait résoudre le problème
npx prisma migrate deploy
```

## Option 2 : Résolution Manuelle

Si la migration partielle a créé des objets :

1. Se connecter à la base de données PostgreSQL
2. Vérifier ce qui a été créé :
```sql
-- Vérifier si l'enum existe
SELECT typname FROM pg_type WHERE typname = 'rnb_import_status';

-- Vérifier si les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');
```

3. Si des objets existent partiellement, les nettoyer :
```sql
-- ATTENTION : Supprime les données existantes
DROP TABLE IF EXISTS "rnb_import_jobs" CASCADE;
DROP TABLE IF EXISTS "rnb_buildings" CASCADE;
DROP TYPE IF EXISTS "rnb_import_status" CASCADE;
```

4. Marquer la migration comme résolue (si Prisma le permet) :
```bash
npx prisma migrate resolve --applied 20250128_add_rnb_models
```

5. Appliquer la nouvelle migration :
```bash
npx prisma migrate deploy
```

## Option 3 : Nouvelle Migration Propre

Si les options précédentes ne fonctionnent pas :

1. Supprimer la migration échouée du système Prisma
2. La migration `20250128_fix_rnb_migration` devrait créer tout proprement

