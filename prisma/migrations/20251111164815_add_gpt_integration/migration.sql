-- CreateTable
CREATE TABLE "gpt_api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "rate_limit" INTEGER NOT NULL DEFAULT 100,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "gpt_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpt_analyses" (
    "id" TEXT NOT NULL,
    "devis_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "gpt_score" DECIMAL(5,2) NOT NULL,
    "gpt_grade" TEXT,
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "analysis" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "alerts" JSONB,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "processing_time" INTEGER,
    "gpt_model" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpt_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gpt_api_keys_api_key_key" ON "gpt_api_keys"("api_key");

-- CreateIndex
CREATE INDEX "gpt_api_keys_api_key_idx" ON "gpt_api_keys"("api_key");

-- CreateIndex
CREATE INDEX "gpt_api_keys_is_active_idx" ON "gpt_api_keys"("is_active");

-- CreateIndex
CREATE INDEX "gpt_api_keys_created_at_idx" ON "gpt_api_keys"("created_at");

-- CreateIndex
CREATE INDEX "gpt_analyses_devis_id_idx" ON "gpt_analyses"("devis_id");

-- CreateIndex
CREATE INDEX "gpt_analyses_api_key_id_idx" ON "gpt_analyses"("api_key_id");

-- CreateIndex
CREATE INDEX "gpt_analyses_created_at_idx" ON "gpt_analyses"("created_at");

-- AddForeignKey
ALTER TABLE "gpt_analyses" ADD CONSTRAINT "gpt_analyses_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gpt_analyses" ADD CONSTRAINT "gpt_analyses_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "gpt_api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
