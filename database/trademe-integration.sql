-- TradeMe API Integration Schema

-- System settings table (for storing API credentials and other config)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'encrypted'
    description TEXT,
    category VARCHAR(50), -- 'trademe', 'general', 'email', etc.
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TradeMe listings (synced from our inventory)
CREATE TABLE IF NOT EXISTS trademe_listings (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    trademe_listing_id BIGINT UNIQUE, -- TradeMe's listing ID
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subtitle VARCHAR(255),
    description TEXT,
    duration INTEGER, -- Days: 2, 3, 5, 7, 10, 14
    start_price DECIMAL(10,2),
    reserve_price DECIMAL(10,2),
    buy_now_price DECIMAL(10,2),
    shipping_price DECIMAL(10,2),
    pickup_allowed BOOLEAN DEFAULT false,
    payment_methods JSONB, -- Array of payment methods
    shipping_options JSONB, -- Array of shipping options
    photos JSONB, -- Array of photo URLs
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'sold', 'unsold', 'closed', 'withdrawn'
    trademe_status VARCHAR(50), -- Status from TradeMe API
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    current_bid DECIMAL(10,2),
    bid_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    watchlist_count INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    trademe_url TEXT,
    success_fees DECIMAL(10,2),
    listing_fees DECIMAL(10,2),
    error_message TEXT,
    last_synced_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- TradeMe listing questions
CREATE TABLE IF NOT EXISTS trademe_questions (
    id SERIAL PRIMARY KEY,
    trademe_listing_id INTEGER REFERENCES trademe_listings(id) ON DELETE CASCADE,
    question_id BIGINT UNIQUE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    asker_nickname VARCHAR(100),
    is_answered BOOLEAN DEFAULT false,
    asked_at TIMESTAMP,
    answered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TradeMe categories cache (to avoid repeated API calls)
CREATE TABLE IF NOT EXISTS trademe_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    parent_category_id VARCHAR(50),
    path TEXT, -- Full category path
    can_list_in BOOLEAN DEFAULT true,
    area VARCHAR(50), -- 'marketplace', 'property', 'motors', 'jobs'
    fees_json JSONB, -- Fee structure for this category
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TradeMe sync log
CREATE TABLE IF NOT EXISTS trademe_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'listing_create', 'listing_update', 'listing_sync', 'question_sync', 'categories_sync'
    entity_id INTEGER,
    entity_type VARCHAR(50), -- 'listing', 'question', 'category'
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trademe_listings_card_id ON trademe_listings(card_id);
CREATE INDEX IF NOT EXISTS idx_trademe_listings_figurine_id ON trademe_listings(figurine_id);
CREATE INDEX IF NOT EXISTS idx_trademe_listings_status ON trademe_listings(status);
CREATE INDEX IF NOT EXISTS idx_trademe_listings_trademe_id ON trademe_listings(trademe_listing_id);
CREATE INDEX IF NOT EXISTS idx_trademe_questions_listing_id ON trademe_questions(trademe_listing_id);
CREATE INDEX IF NOT EXISTS idx_trademe_questions_answered ON trademe_questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_trademe_categories_parent ON trademe_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_trademe_sync_log_type ON trademe_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_trademe_sync_log_status ON trademe_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default TradeMe settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
    ('trademe_consumer_key', '', 'encrypted', 'TradeMe API Consumer Key (OAuth)', 'trademe'),
    ('trademe_consumer_secret', '', 'encrypted', 'TradeMe API Consumer Secret (OAuth)', 'trademe'),
    ('trademe_enabled', 'false', 'boolean', 'Enable TradeMe integration', 'trademe'),
    ('trademe_sandbox_mode', 'true', 'boolean', 'Use TradeMe Sandbox API for testing', 'trademe'),
    ('trademe_auto_sync', 'true', 'boolean', 'Automatically sync listings every hour', 'trademe'),
    ('trademe_default_duration', '7', 'number', 'Default listing duration in days', 'trademe'),
    ('trademe_default_shipping', '5.00', 'number', 'Default shipping price (NZD)', 'trademe'),
    ('trademe_success_fee_percent', '7.9', 'number', 'TradeMe success fee percentage', 'trademe')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to update trademe_listings updated_at
CREATE OR REPLACE FUNCTION update_trademe_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trademe_listings
DROP TRIGGER IF EXISTS trigger_trademe_listing_timestamp ON trademe_listings;
CREATE TRIGGER trigger_trademe_listing_timestamp
    BEFORE UPDATE ON trademe_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_trademe_listing_timestamp();

-- Function to update system_settings updated_at
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for system_settings
DROP TRIGGER IF EXISTS trigger_system_settings_timestamp ON system_settings;
CREATE TRIGGER trigger_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_timestamp();
