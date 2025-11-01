# 🚀 Application Immédiate de la Migration

## ⚡ Solution Rapide (2 minutes)

### Option 1 : Via Railway CLI (Recommandé)

1. **Lier Railway** (une seule fois) :
   ```bash
   railway link
   ```
   Sélectionnez votre projet dans la liste.

2. **Appliquer la migration** :
   ```bash
   railway run npx prisma migrate deploy
   ```

3. **Vérifier** :
   ```bash
   railway run npx prisma migrate status
   ```

✅ **C'est tout !** La migration sera appliquée automatiquement.

---

### Option 2 : Via DATABASE_URL Locale

1. **Récupérer DATABASE_URL depuis Railway** :
   - Allez sur [Railway Dashboard](https://railway.app)
   - Sélectionnez votre projet PostgreSQL
   - Cliquez sur "Variables" ou "Connect"
   - Copiez la valeur de `DATABASE_URL`

2. **Configurer localement** :

   **Windows PowerShell** :
   ```powershell
   $env:DATABASE_URL="postgresql://username:password@host:port/database"
   npx prisma migrate deploy
   ```

   **Linux/Mac** :
   ```bash
   export DATABASE_URL="postgresql://username:password@host:port/database"
   npx prisma migrate deploy
   ```

3. **Régénérer le client Prisma** :
   ```bash
   npx prisma generate
   ```

---

### Option 3 : Via Script Direct (Si DATABASE_URL configurée)

Si vous avez déjà DATABASE_URL configurée dans un fichier `.env.local` :

```bash
npx tsx scripts/apply-migration-direct.ts
```

Ce script se connecte directement et applique la migration avec vérifications.

---

## 🔍 Vérification Post-Migration

Après l'application, vérifiez que tout fonctionne :

```sql
-- Via Railway SQL Editor ou psql
SELECT unnest(enum_range(NULL::building_profile_role));
-- Devrait retourner: PROPRIETAIRE, LOCATAIRE

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'building_profiles' 
  AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data');
-- Devrait retourner 4 lignes

SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'building_profiles' 
  AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx';
-- Devrait retourner 1 ligne
```

---

## ❓ Problèmes ?

### "No linked project found"
→ Exécutez `railway link` d'abord

### "Environment variable not found: DATABASE_URL"
→ Configurez DATABASE_URL (Option 2 ci-dessus)

### "Cannot connect to database"
→ Vérifiez que votre base Railway est active et que DATABASE_URL est correcte

---

## ✅ Après Migration

Une fois la migration appliquée :

1. ✅ Le client Prisma sera automatiquement régénéré
2. ✅ Vous pouvez créer des cartes propriétaire avec unicité garantie
3. ✅ Vous pouvez créer des cartes locataire liées
4. ✅ Le système DVF sera intégré dans l'enrichissement

**Prêt à utiliser !** 🎉

