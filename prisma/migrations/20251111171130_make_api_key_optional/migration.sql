-- AlterTable: Rendre api_key_id optionnel pour les appels système automatiques
ALTER TABLE "gpt_analyses" ALTER COLUMN "api_key_id" DROP NOT NULL;

-- Modifier la contrainte de clé étrangère pour SetNull au lieu de Cascade
ALTER TABLE "gpt_analyses" DROP CONSTRAINT IF EXISTS "gpt_analyses_api_key_id_fkey";

ALTER TABLE "gpt_analyses" ADD CONSTRAINT "gpt_analyses_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "gpt_api_keys"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
