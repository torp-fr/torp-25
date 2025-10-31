-- CreateTable
CREATE TABLE IF NOT EXISTS "project_ccf" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "devis_id" TEXT,
    "project_type" TEXT NOT NULL,
    "project_title" TEXT,
    "project_description" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "region" TEXT,
    "coordinates" JSONB,
    "building_data" JSONB,
    "urbanism_data" JSONB,
    "energy_data" JSONB,
    "constraints" JSONB,
    "requirements" JSONB,
    "budget_range" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_ccf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL,
    "devis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "recommendation_id" TEXT,
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "complementary_documents" (
    "id" TEXT NOT NULL,
    "devis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recommendation_id" TEXT,
    "recommendation_type" TEXT,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "validation_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complementary_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommendation_feedback" (
    "id" TEXT NOT NULL,
    "devis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "rating" INTEGER,
    "useful" BOOLEAN,
    "action_taken" BOOLEAN,
    "feedback_text" TEXT,
    "documents_added" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "external_data_cache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_data_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "project_ccf_devis_id_key" ON "project_ccf"("devis_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_ccf_user_id_idx" ON "project_ccf"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_ccf_devis_id_idx" ON "project_ccf"("devis_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_messages_devis_id_idx" ON "chat_messages"("devis_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_messages_user_id_idx" ON "chat_messages"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "complementary_documents_devis_id_idx" ON "complementary_documents"("devis_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "complementary_documents_user_id_idx" ON "complementary_documents"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "complementary_documents_recommendation_id_idx" ON "complementary_documents"("recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_feedback_devis_id_recommendation_id_key" ON "recommendation_feedback"("devis_id", "recommendation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recommendation_feedback_devis_id_idx" ON "recommendation_feedback"("devis_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recommendation_feedback_user_id_idx" ON "recommendation_feedback"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "external_data_cache_cache_key_key" ON "external_data_cache"("cache_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "external_data_cache_cache_key_idx" ON "external_data_cache"("cache_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "external_data_cache_expires_at_idx" ON "external_data_cache"("expires_at");

-- AddForeignKey
ALTER TABLE "project_ccf" ADD CONSTRAINT "project_ccf_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ccf" ADD CONSTRAINT "project_ccf_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complementary_documents" ADD CONSTRAINT "complementary_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complementary_documents" ADD CONSTRAINT "complementary_documents_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

