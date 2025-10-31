-- Migration de résolution pour la migration RNB échouée
-- Cette migration corrige l'état de la base de données après l'échec de 20250128_add_rnb_models

-- 1. Résoudre l'état de la migration précédente si nécessaire
-- (Prisma le fera automatiquement, mais on s'assure que l'enum existe)

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "rnb_import_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Créer les tables si elles n'existent pas
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

-- 3. Créer les index si ils n'existent pas
DO $$ BEGIN
  CREATE UNIQUE INDEX "rnb_buildings_rnb_id_key" ON "rnb_buildings"("rnb_id") WHERE "rnb_id" IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_buildings_department_idx" ON "rnb_buildings"("department");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_buildings_code_insee_idx" ON "rnb_buildings"("code_insee");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_buildings_postal_code_idx" ON "rnb_buildings"("postal_code");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_buildings_dpe_class_idx" ON "rnb_buildings"("dpe_class");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_buildings_indexed_at_idx" ON "rnb_buildings"("indexed_at");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_import_jobs_department_idx" ON "rnb_import_jobs"("department");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_import_jobs_status_idx" ON "rnb_import_jobs"("status");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX "rnb_import_jobs_created_at_idx" ON "rnb_import_jobs"("created_at");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

