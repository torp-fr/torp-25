# Déploiement de la Migration CCF, Chat et Documents

## Application de la Migration

### Sur Vercel (Production)

La migration est appliquée **automatiquement** lors du déploiement via le script `db:migrate:deploy` dans `package.json`.

Le processus :
1. Vercel détecte le nouveau commit
2. Exécute `npm run db:migrate:deploy` pendant le build
3. Prisma applique toutes les migrations en attente
4. Le client Prisma est généré automatiquement

**Aucune action manuelle requise** ✅

### En Local (Développement)

Si vous avez une base de données locale configurée :

```bash
# 1. Créer un fichier .env.local avec DATABASE_URL
echo "DATABASE_URL=postgresql://user:password@localhost:5432/torp" > .env.local

# 2. Appliquer la migration
npm run db:migrate

# 3. Générer le client Prisma
npm run db:generate
```

## Vérification de la Migration

Après le déploiement sur Vercel, vous pouvez vérifier que les tables ont été créées :

### Option 1 : Via Prisma Studio (si accès DB)
```bash
npx prisma studio
```

### Option 2 : Via une requête SQL directe
```sql
-- Vérifier l'existence des nouvelles tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'project_ccf',
    'chat_messages',
    'complementary_documents',
    'recommendation_feedback',
    'external_data_cache'
  );
```

### Option 3 : Via l'application
- Tester l'upload avec le wizard CCF : `/upload`
- Vérifier que le CCF est sauvegardé
- Tester le chat sur une page d'analyse : `/analysis/[id]`
- Vérifier l'upload de documents complémentaires

## Rollback (si nécessaire)

Si vous devez annuler la migration :

```sql
-- ATTENTION : Cela supprime toutes les données des nouvelles tables !
DROP TABLE IF EXISTS "external_data_cache";
DROP TABLE IF EXISTS "recommendation_feedback";
DROP TABLE IF EXISTS "complementary_documents";
DROP TABLE IF EXISTS "chat_messages";
DROP TABLE IF EXISTS "project_ccf";
```

Puis supprimez la migration de `prisma/migrations/`.

## Notes Importantes

- ⚠️ Les migrations sur Vercel sont appliquées en mode **production** (pas de création de nouvelles migrations)
- ✅ Le client Prisma est généré automatiquement après chaque migration
- ✅ Les données existantes ne sont **pas affectées** par cette migration
- ✅ Les nouvelles tables sont indépendantes et n'affectent pas le fonctionnement actuel

## Prochaines Étapes

Une fois la migration appliquée :

1. ✅ Tester le wizard CCF sur `/upload`
2. ✅ Tester le chat sur `/analysis/[id]`
3. ✅ Tester l'upload de documents complémentaires
4. ✅ Vérifier que les recommandations sont interactives
5. ✅ Tester le système de feedback

## Support

En cas de problème lors de la migration :
- Vérifier les logs Vercel lors du build
- Vérifier que `DATABASE_URL` est bien configuré dans Vercel
- Vérifier que la base de données PostgreSQL est accessible

