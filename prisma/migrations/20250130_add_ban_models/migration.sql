-- Migration BAN - Création des tables et enum
-- Dataset ID: 5530fbacc751df5ff937dddb

-- 1. Création de l'enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ban_import_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Création de la table ban_addresses
CREATE TABLE IF NOT EXISTS "ban_addresses" (
    "id" TEXT NOT NULL,
    "ban_id" TEXT,
    "department" TEXT NOT NULL,
    "code_insee" TEXT,
    "commune" TEXT,
    "formatted" TEXT NOT NULL,
    "house_number" TEXT,
    "street" TEXT,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "coordinates" JSONB,
    "citycode" TEXT,
    "district" TEXT,
    "source_url" TEXT,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ban_addresses_pkey" PRIMARY KEY ("id")
);

-- 3. Création de la table ban_import_jobs
CREATE TABLE IF NOT EXISTS "ban_import_jobs" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "resource_id" TEXT,
    "resource_url" TEXT NOT NULL,
    "status" "ban_import_status" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_rows" INTEGER,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ban_import_jobs_pkey" PRIMARY KEY ("id")
);

-- 4. Création des index
-- Index unique sur ban_id (avec gestion NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ban_addresses_ban_id_key' 
    AND tablename = 'ban_addresses'
  ) THEN
    CREATE UNIQUE INDEX "ban_addresses_ban_id_key" ON "ban_addresses"("ban_id") WHERE "ban_id" IS NOT NULL;
  END IF;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Index standards
CREATE INDEX IF NOT EXISTS "ban_addresses_department_idx" ON "ban_addresses"("department");
CREATE INDEX IF NOT EXISTS "ban_addresses_code_insee_idx" ON "ban_addresses"("code_insee");
CREATE INDEX IF NOT EXISTS "ban_addresses_postal_code_idx" ON "ban_addresses"("postal_code");
CREATE INDEX IF NOT EXISTS "ban_addresses_city_idx" ON "ban_addresses"("city");
CREATE INDEX IF NOT EXISTS "ban_addresses_formatted_idx" ON "ban_addresses"("formatted");
CREATE INDEX IF NOT EXISTS "ban_addresses_indexed_at_idx" ON "ban_addresses"("indexed_at");

CREATE INDEX IF NOT EXISTS "ban_import_jobs_department_idx" ON "ban_import_jobs"("department");
CREATE INDEX IF NOT EXISTS "ban_import_jobs_status_idx" ON "ban_import_jobs"("status");
CREATE INDEX IF NOT EXISTS "ban_import_jobs_created_at_idx" ON "ban_import_jobs"("created_at");

