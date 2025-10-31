-- ============================================
-- MIGRATION - Building Profile Role & Hierarchy
-- Système propriétaire/locataire avec unicité par bien
-- ============================================

-- ÉTAPE 1: CRÉATION DE L'ENUM BuildingProfileRole
DO $$ BEGIN
  CREATE TYPE "building_profile_role" AS ENUM (
    'PROPRIETAIRE',
    'LOCATAIRE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ÉTAPE 2: AJOUT DES COLONNES AUX BUILDING_PROFILES
ALTER TABLE "building_profiles"
  ADD COLUMN IF NOT EXISTS "role" "building_profile_role" NOT NULL DEFAULT 'PROPRIETAIRE',
  ADD COLUMN IF NOT EXISTS "parent_profile_id" TEXT,
  ADD COLUMN IF NOT EXISTS "lot_number" TEXT,
  ADD COLUMN IF NOT EXISTS "tenant_data" JSONB;

-- ÉTAPE 3: CRÉATION DE LA CONTRAINTE UNIQUE
-- Une seule carte PROPRIETAIRE par combinaison (parcelle + section + lot)
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "building_profiles_unique_proprietaire_per_bien_idx"
  ON "building_profiles" ("parcelle_number", "section_cadastrale", "lot_number", "role")
  WHERE "role" = 'PROPRIETAIRE'
    AND "parcelle_number" IS NOT NULL
    AND "section_cadastrale" IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- ÉTAPE 4: CRÉATION DE L'INDEX POUR LES RELATIONS PARENT/ENFANT
CREATE INDEX IF NOT EXISTS "building_profiles_parent_profile_id_idx" 
ON "building_profiles" ("parent_profile_id");

-- ÉTAPE 5: AJOUT DE LA CONTRAINTE FOREIGN KEY (si elle n'existe pas)
DO $$ BEGIN
  ALTER TABLE "building_profiles"
    ADD CONSTRAINT "building_profiles_parent_profile_id_fkey"
    FOREIGN KEY ("parent_profile_id")
    REFERENCES "building_profiles" ("id")
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ÉTAPE 6: MIGRATION DES DONNÉES EXISTANTES
-- Toutes les cartes existantes deviennent PROPRIETAIRE
UPDATE "building_profiles"
SET "role" = 'PROPRIETAIRE'
WHERE "role" IS NULL;

