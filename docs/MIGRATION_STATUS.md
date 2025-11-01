# État de la Migration Building Profile Role

## ✅ Travail Terminé

### 1. Développement Backend
- ✅ **Schema Prisma** : Modèle BuildingProfile avec rôle et hiérarchie
- ✅ **Migration SQL** : Script de migration complet (`prisma/migrations/20250131_add_building_profile_role/migration.sql`)
- ✅ **Service BuildingProfileService** : 
  - Support des rôles PROPRIETAIRE/LOCATAIRE
  - Validation d'unicité pour propriétaires
  - Création de cartes locataires liées
  - Enrichissement DVF intégré
- ✅ **API Routes** :
  - `POST /api/building-profiles` : Création avec support rôle
  - `POST /api/building-profiles/[id]/tenant` : Création carte locataire
  - `GET /api/building-profiles/[id]/tenant` : Liste des cartes locataires
- ✅ **Client Prisma** : Régénéré avec les nouveaux types

### 2. Intégration DVF
- ✅ **DVFService** : Service complet pour données DVF
- ✅ **Enrichissement automatique** : Intégré dans BuildingProfileService
- ✅ **Route API DVF** : `/api/dvf` pour accès direct
- ✅ **Affichage UI** : Estimation, statistiques, comparables dans `/buildings/[id]`

### 3. Documentation
- ✅ **Guide de migration** : `scripts/APPLY_MIGRATION_GUIDE.md`
- ✅ **Documentation système** : `docs/BUILDING_PROFILE_SYSTEM.md`
- ✅ **Scripts d'application** :
  - `scripts/apply-building-profile-role-migration.js` (Node.js)
  - `scripts/apply-building-profile-role-migration.sh` (Bash)
  - `scripts/apply-building-profile-role-migration.ps1` (PowerShell)

## ⏳ Travail en Attente

### Migration Base de Données

**Statut** : Migration SQL créée mais **non appliquée**

**Action requise** : Application de la migration sur la base de données production

#### Option 1 : Via Railway (Recommandé)
```bash
# 1. Lier Railway au projet
railway link

# 2. Appliquer la migration
railway run npx prisma migrate deploy

# 3. Vérifier le statut
railway run npx prisma migrate status
```

#### Option 2 : Via DATABASE_URL locale
```bash
# 1. Configurer DATABASE_URL
export DATABASE_URL="postgresql://..."  # Linux/Mac
# OU
$env:DATABASE_URL="postgresql://..."   # Windows PowerShell

# 2. Appliquer la migration
npx prisma migrate deploy

# 3. Régénérer le client Prisma
npx prisma generate
```

#### Option 3 : Via Script automatique
```bash
node scripts/apply-building-profile-role-migration.js
```

**Vérification post-migration** :
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

### Tests

**Statut** : À faire

**Actions** :
1. Tester la création d'une carte propriétaire
2. Tester l'unicité (tentative de création d'une deuxième carte pour le même bien)
3. Tester la création d'une carte locataire
4. Tester l'enrichissement DVF avec une adresse réelle
5. Tester la récupération des cartes locataires

## 📝 Fichiers Créés/Modifiés

### Fichiers Nouveaux
- `prisma/migrations/20250131_add_building_profile_role/migration.sql`
- `scripts/apply-building-profile-role-migration.js`
- `scripts/apply-building-profile-role-migration.sh`
- `scripts/apply-building-profile-role-migration.ps1`
- `scripts/APPLY_MIGRATION_GUIDE.md`
- `app/api/building-profiles/[id]/tenant/route.ts`
- `docs/BUILDING_PROFILE_SYSTEM.md`
- `docs/MIGRATION_STATUS.md` (ce fichier)

### Fichiers Modifiés
- `prisma/schema.prisma` : Ajout du système rôle/hiérarchie
- `services/building-profile-service.ts` : Support rôles + DVF
- `app/api/building-profiles/route.ts` : Support rôle dans création
- `services/external-apis/dvf-service.ts` : Service DVF complet
- `app/api/dvf/route.ts` : Route API DVF
- `app/buildings/[id]/page.tsx` : Affichage données DVF

## 🎯 Prochaines Étapes

1. **Immédiat** : Appliquer la migration (voir section ci-dessus)
2. **Court terme** : Tester les fonctionnalités propriétaire/locataire
3. **Court terme** : Tester l'enrichissement DVF avec adresses réelles
4. **Moyen terme** : Ajouter UI pour création cartes locataires
5. **Moyen terme** : Ajouter gestion `tenantData` dans l'interface

## ⚠️ Notes Importantes

- **La migration doit être appliquée avant** d'utiliser les nouvelles fonctionnalités
- Les cartes existantes seront automatiquement converties en `PROPRIETAIRE`
- L'enrichissement DVF nécessite des données disponibles dans l'API DVF+
- La contrainte d'unicité garantit qu'une seule carte propriétaire existe par bien

