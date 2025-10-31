-- Script de vérification de la migration Building Profile Role
-- Exécuter ce script après la migration pour vérifier que tout est correct

-- 1. Vérifier que l'enum existe
SELECT 
    'Enum building_profile_role' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'building_profile_role'
        ) THEN '✅ Existe' 
        ELSE '❌ Manquant' 
    END as status;

-- 2. Vérifier les valeurs de l'enum
SELECT 
    'Valeurs enum' as check_name,
    unnest(enum_range(NULL::building_profile_role)) as enum_values;

-- 3. Vérifier que les colonnes existent
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'building_profiles' 
  AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data')
ORDER BY column_name;

-- 4. Vérifier l'index unique
SELECT 
    'Index unique' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'building_profiles_unique_proprietaire_per_bien_idx'
        ) THEN '✅ Existe' 
        ELSE '❌ Manquant' 
    END as status,
    indexdef
FROM pg_indexes 
WHERE indexname = 'building_profiles_unique_proprietaire_per_bien_idx';

-- 5. Vérifier l'index parent_profile_id
SELECT 
    'Index parent_profile_id' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'building_profiles_parent_profile_id_idx'
        ) THEN '✅ Existe' 
        ELSE '❌ Manquant' 
    END as status;

-- 6. Vérifier la foreign key
SELECT 
    'Foreign key parent_profile_id' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'building_profiles_parent_profile_id_fkey'
        ) THEN '✅ Existe' 
        ELSE '❌ Manquant' 
    END as status;

-- 7. Statistiques sur les rôles
SELECT 
    'Statistiques rôles' as check_name,
    role,
    COUNT(*) as count
FROM building_profiles 
GROUP BY role
ORDER BY role;

-- 8. Vérifier les cartes locataires et leurs parents
SELECT 
    'Relations parent/enfant' as check_name,
    COUNT(*) FILTER (WHERE role = 'LOCATAIRE') as cartes_locataires,
    COUNT(*) FILTER (WHERE role = 'LOCATAIRE' AND parent_profile_id IS NOT NULL) as locataires_avec_parent,
    COUNT(*) FILTER (WHERE role = 'PROPRIETAIRE') as cartes_proprietaires
FROM building_profiles;

-- 9. Vérifier l'intégrité référentielle (cartes locataires orphelines)
SELECT 
    'Intégrité référentielle' as check_name,
    COUNT(*) as cartes_locataires_orphelines
FROM building_profiles bp_loc
WHERE bp_loc.role = 'LOCATAIRE'
  AND bp_loc.parent_profile_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM building_profiles bp_parent
      WHERE bp_parent.id = bp_loc.parent_profile_id
        AND bp_parent.role = 'PROPRIETAIRE'
  );

-- 10. Test de l'unicité (chercher les doublons potentiels)
SELECT 
    'Test unicité' as check_name,
    parcelle_number,
    section_cadastrale,
    COALESCE(lot_number, '') as lot_number,
    COUNT(*) as count
FROM building_profiles
WHERE role = 'PROPRIETAIRE'
  AND parcelle_number IS NOT NULL
  AND section_cadastrale IS NOT NULL
GROUP BY parcelle_number, section_cadastrale, COALESCE(lot_number, '')
HAVING COUNT(*) > 1;

