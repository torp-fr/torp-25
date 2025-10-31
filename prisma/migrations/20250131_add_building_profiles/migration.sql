-- ============================================
-- MIGRATION - Building Profiles & Documents
-- Carte d'identité du logement et coffre-fort
-- ============================================

-- ÉTAPE 1: CRÉATION DE L'ENUM BuildingDocumentType
DO $$ BEGIN
  CREATE TYPE "building_document_type" AS ENUM (
    'TITLE_DEED',
    'INSURANCE_HOME',
    'INSURANCE_LIFE',
    'PROPERTY_TAX',
    'NOTARY_ACT',
    'CONSTRUCTION_PERMIT',
    'DPE_CERTIFICATE',
    'TECHNICAL_REPORT',
    'WARRANTY',
    'MAINTENANCE_LOG',
    'ENERGY_CERTIFICATE',
    'RGE_CERTIFICATE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ÉTAPE 2: CRÉATION DE LA TABLE building_profiles
CREATE TABLE IF NOT EXISTS "building_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "address" JSONB NOT NULL,
    "coordinates" JSONB,
    "cadastral_data" JSONB,
    "parcelle_number" TEXT,
    "section_cadastrale" TEXT,
    "code_insee" TEXT,
    "enriched_data" JSONB,
    "plu_data" JSONB,
    "rnb_data" JSONB,
    "dpe_data" JSONB,
    "urbanism_data" JSONB,
    "enrichment_status" TEXT NOT NULL DEFAULT 'pending',
    "enrichment_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enrichment_errors" JSONB,
    "last_enriched_at" TIMESTAMP(3),
    "custom_fields" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_profiles_pkey" PRIMARY KEY ("id")
);

-- ÉTAPE 3: CRÉATION DE LA TABLE building_documents
CREATE TABLE IF NOT EXISTS "building_documents" (
    "id" TEXT NOT NULL,
    "building_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" "building_document_type" NOT NULL,
    "document_category" TEXT,
    "description" TEXT,
    "extracted_data" JSONB,
    "ocr_status" "document_status" NOT NULL DEFAULT 'PENDING',
    "ocr_data" JSONB,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_documents_pkey" PRIMARY KEY ("id")
);

-- ÉTAPE 4: CRÉATION DES INDEX
CREATE INDEX IF NOT EXISTS "building_profiles_user_id_idx" ON "building_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "building_profiles_code_insee_idx" ON "building_profiles"("code_insee");
CREATE INDEX IF NOT EXISTS "building_profiles_parcelle_number_idx" ON "building_profiles"("parcelle_number");

CREATE INDEX IF NOT EXISTS "building_documents_building_profile_id_idx" ON "building_documents"("building_profile_id");
CREATE INDEX IF NOT EXISTS "building_documents_user_id_idx" ON "building_documents"("user_id");
CREATE INDEX IF NOT EXISTS "building_documents_document_type_idx" ON "building_documents"("document_type");
CREATE INDEX IF NOT EXISTS "building_documents_document_date_idx" ON "building_documents"("document_date");
CREATE INDEX IF NOT EXISTS "building_documents_expiration_date_idx" ON "building_documents"("expiration_date");

-- ÉTAPE 5: CRÉATION DES FOREIGN KEYS
DO $$ BEGIN
  -- Foreign key building_profiles -> users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'building_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE "building_profiles" 
    ADD CONSTRAINT "building_profiles_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Foreign key building_documents -> users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'building_documents_user_id_fkey'
  ) THEN
    ALTER TABLE "building_documents" 
    ADD CONSTRAINT "building_documents_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Foreign key building_documents -> building_profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'building_documents_building_profile_id_fkey'
  ) THEN
    ALTER TABLE "building_documents" 
    ADD CONSTRAINT "building_documents_building_profile_id_fkey" 
    FOREIGN KEY ("building_profile_id") REFERENCES "building_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

