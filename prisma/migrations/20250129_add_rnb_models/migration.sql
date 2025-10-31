-- Migration RNB - Création des tables et enum
-- Cette migration remplace les migrations échouées précédentes

-- CreateEnum (idempotent pour éviter erreurs si l'enum existe déjà)
DO $$ BEGIN
  CREATE TYPE "rnb_import_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: rnb_buildings
CREATE TABLE IF NOT EXISTS "rnb_buildings" (
    "id" TEXT NOT NULL,
    "rnb_id" TEXT,
    "department" TEXT NOT NULL,
    "code_insee" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "coordinates" JSONB,
    "construction_year" INTEGER,
    "building_type" TEXT,
    "surface" DOUBLE PRECISION,
    "dpe_class" TEXT,
    "dpe_date" TIMESTAMP(3),
    "energy_consumption" DOUBLE PRECISION,
    "ghg_emissions" DOUBLE PRECISION,
    "hvd" BOOLEAN NOT NULL DEFAULT false,
    "source_url" TEXT,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rnb_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rnb_import_jobs
CREATE TABLE IF NOT EXISTS "rnb_import_jobs" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "resource_id" TEXT,
    "resource_url" TEXT NOT NULL,
    "status" "rnb_import_status" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_rows" INTEGER,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rnb_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index on rnb_id (with NULL handling)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'rnb_buildings_rnb_id_key' 
    AND tablename = 'rnb_buildings'
  ) THEN
    CREATE UNIQUE INDEX "rnb_buildings_rnb_id_key" ON "rnb_buildings"("rnb_id") WHERE "rnb_id" IS NOT NULL;
  END IF;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- CreateIndex: Standard indexes
CREATE INDEX IF NOT EXISTS "rnb_buildings_department_idx" ON "rnb_buildings"("department");
CREATE INDEX IF NOT EXISTS "rnb_buildings_code_insee_idx" ON "rnb_buildings"("code_insee");
CREATE INDEX IF NOT EXISTS "rnb_buildings_postal_code_idx" ON "rnb_buildings"("postal_code");
CREATE INDEX IF NOT EXISTS "rnb_buildings_dpe_class_idx" ON "rnb_buildings"("dpe_class");
CREATE INDEX IF NOT EXISTS "rnb_buildings_indexed_at_idx" ON "rnb_buildings"("indexed_at");

CREATE INDEX IF NOT EXISTS "rnb_import_jobs_department_idx" ON "rnb_import_jobs"("department");
CREATE INDEX IF NOT EXISTS "rnb_import_jobs_status_idx" ON "rnb_import_jobs"("status");
CREATE INDEX IF NOT EXISTS "rnb_import_jobs_created_at_idx" ON "rnb_import_jobs"("created_at");

