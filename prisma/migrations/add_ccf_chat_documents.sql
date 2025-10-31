-- Migration: Ajout des tables pour CCF, Chat, Documents complémentaires et Feedback
-- À exécuter après validation du schéma

-- Table pour les Cahiers des Charges Fonctionnels (CCF)
CREATE TABLE IF NOT EXISTS project_ccf (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    devis_id TEXT REFERENCES devis(id) ON DELETE CASCADE,
    
    -- Informations projet
    project_type TEXT NOT NULL, -- 'construction', 'renovation', 'extension', 'maintenance'
    project_title TEXT,
    project_description TEXT,
    
    -- Localisation (avec données enrichies)
    address TEXT,
    postal_code TEXT,
    city TEXT,
    region TEXT,
    coordinates JSONB, -- {lat, lng}
    
    -- Données bâti (depuis APIs externes)
    building_data JSONB, -- ONTB, PLU, Urbanisme, DPE, etc.
    urbanism_data JSONB, -- APU, autorisations
    energy_data JSONB, -- DPE, audit énergétique
    
    -- Contraintes et besoins
    constraints JSONB, -- Contraintes techniques, réglementaires
    requirements JSONB, -- Besoins fonctionnels, préférences
    budget_range JSONB, -- {min, max, preferred}
    
    -- Métadonnées
    status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'linked'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_ccf_user ON project_ccf(user_id);
CREATE INDEX idx_project_ccf_devis ON project_ccf(devis_id);

-- Table pour les messages de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    devis_id TEXT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contenu
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB, -- Pour stocker des infos additionnelles
    
    -- Références
    recommendation_id TEXT, -- Si lié à une recommandation
    document_id TEXT, -- Si lié à un document
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_devis ON chat_messages(devis_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);

-- Table pour les documents complémentaires
CREATE TABLE IF NOT EXISTS complementary_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    devis_id TEXT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Lien avec recommandation
    recommendation_id TEXT, -- ID de la recommandation qui a généré la demande
    recommendation_type TEXT, -- Type de recommandation (assurance, garantie, etc.)
    
    -- Fichier
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    
    -- Métadonnées
    document_type TEXT, -- 'insurance', 'warranty', 'certificate', 'other'
    status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
    validation_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_complementary_documents_devis ON complementary_documents(devis_id);
CREATE INDEX idx_complementary_documents_user ON complementary_documents(user_id);
CREATE INDEX idx_complementary_documents_recommendation ON complementary_documents(recommendation_id);

-- Table pour le feedback sur les recommandations
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    devis_id TEXT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_id TEXT NOT NULL, -- ID de la recommandation dans le breakdown
    
    -- Feedback
    rating INTEGER, -- 1-5
    useful BOOLEAN,
    action_taken BOOLEAN, -- Si l'utilisateur a suivi la recommandation
    feedback_text TEXT,
    
    -- Documents ajoutés suite à cette recommandation
    documents_added TEXT[], -- IDs des documents complémentaires
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recommendation_feedback_devis ON recommendation_feedback(devis_id);
CREATE INDEX idx_recommendation_feedback_user ON recommendation_feedback(user_id);

-- Table pour stocker les données agrégées depuis les APIs externes
CREATE TABLE IF NOT EXISTS external_data_cache (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Clé unique basée sur les paramètres
    cache_key TEXT NOT NULL UNIQUE,
    data_type TEXT NOT NULL, -- 'address', 'urbanism', 'ontb', 'plu', 'dpe', etc.
    
    -- Données
    data JSONB NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMP NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_external_data_cache_key ON external_data_cache(cache_key);
CREATE INDEX idx_external_data_cache_expires ON external_data_cache(expires_at);

