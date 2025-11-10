-- TrulyCollectables Feature Enhancements Migration
-- Run this to add new tables for all 12 high-value features

-- 1. CSV Import History
CREATE TABLE IF NOT EXISTS csv_imports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER,
    successful_rows INTEGER,
    failed_rows INTEGER,
    duplicates_skipped INTEGER,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Price History Tracking
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    price_nzd DECIMAL(10,2) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    reason VARCHAR(100), -- 'manual_update', 'bulk_import', 'price_adjustment'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_history_card_id ON price_history(card_id);
CREATE INDEX idx_price_history_created_at ON price_history(created_at);

-- 3. Multiple Card Images (for condition comparison)
CREATE TABLE IF NOT EXISTS card_images (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50), -- 'front', 'back', 'detail', 'edge', 'corner'
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_card_images_card_id ON card_images(card_id);

-- 4. Bundles/Packs System
CREATE TABLE IF NOT EXISTS bundles (
    id SERIAL PRIMARY KEY,
    bundle_name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50), -- 'mystery_pack', 'themed', 'starter', 'premium'
    price_nzd DECIMAL(10,2) NOT NULL,
    original_value_nzd DECIMAL(10,2), -- Show savings
    quantity INTEGER DEFAULT 1,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bundle_items (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER REFERENCES bundles(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1
);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- 5. Trade-In System
CREATE TABLE IF NOT EXISTS trade_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_name VARCHAR(255) NOT NULL,
    set_name VARCHAR(255),
    card_number VARCHAR(50),
    year INTEGER,
    sport_type VARCHAR(50),
    condition VARCHAR(50),
    asking_price_nzd DECIMAL(10,2),
    description TEXT,
    image_urls TEXT[], -- Array of image URLs
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewing', 'offer_made', 'accepted', 'declined', 'completed'
    offer_amount_nzd DECIMAL(10,2),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_submissions_user_id ON trade_submissions(user_id);
CREATE INDEX idx_trade_submissions_status ON trade_submissions(status);

-- 6. Social Proof - Recently Sold Tracking
CREATE TABLE IF NOT EXISTS sold_cards (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id),
    card_name VARCHAR(255) NOT NULL,
    set_name VARCHAR(255),
    price_nzd DECIMAL(10,2) NOT NULL,
    sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sold_cards_sold_at ON sold_cards(sold_at);

-- 7. View Tracking (for "X people viewing")
CREATE TABLE IF NOT EXISTS card_views (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_card_views_card_id ON card_views(card_id);
CREATE INDEX idx_card_views_viewed_at ON card_views(viewed_at);

-- 8. Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(100) NOT NULL,
    search_params JSONB NOT NULL, -- Store all filter params as JSON
    notify_on_match BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);

-- 9. Set Completion Tracking
CREATE TABLE IF NOT EXISTS set_trackers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    set_name VARCHAR(255) NOT NULL,
    sport_type VARCHAR(50),
    year INTEGER,
    total_cards INTEGER, -- Total cards in set
    owned_count INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_set_trackers_user_id ON set_trackers(user_id);

-- 10. Grading Information Database
CREATE TABLE IF NOT EXISTS grading_info (
    id SERIAL PRIMARY KEY,
    company VARCHAR(50) NOT NULL, -- 'PSA', 'BGS', 'CGC', etc.
    service_level VARCHAR(100),
    price_usd DECIMAL(10,2),
    price_nzd DECIMAL(10,2),
    turnaround_days INTEGER,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Wishlist Notifications Queue
CREATE TABLE IF NOT EXISTS wishlist_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    collection_item_id INTEGER REFERENCES user_collections(id) ON DELETE CASCADE,
    notification_type VARCHAR(50), -- 'new_match', 'price_drop', 'back_in_stock'
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wishlist_notifications_user_id ON wishlist_notifications(user_id);
CREATE INDEX idx_wishlist_notifications_sent ON wishlist_notifications(sent);

-- 12. Email Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    wishlist_alerts BOOLEAN DEFAULT true,
    price_drop_alerts BOOLEAN DEFAULT true,
    new_stock_alerts BOOLEAN DEFAULT false,
    order_updates BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to existing cards table for enhanced features
ALTER TABLE cards ADD COLUMN IF NOT EXISTS player_name VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS rarity VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS graded BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS grade_company VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS grade_value VARCHAR(20);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS times_sold INTEGER DEFAULT 0;

-- Add indexes for new card columns
CREATE INDEX IF NOT EXISTS idx_cards_player_name ON cards(player_name);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_graded ON cards(graded);

-- Add shipping weight to cards for calculator
ALTER TABLE cards ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT 5; -- Average card weight

-- Add bundle support to cart and orders
ALTER TABLE cart ADD COLUMN IF NOT EXISTS bundle_id INTEGER REFERENCES bundles(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS bundle_id INTEGER REFERENCES bundles(id);

-- Update cart constraint to include bundles
ALTER TABLE cart DROP CONSTRAINT IF EXISTS one_product_type;
ALTER TABLE cart ADD CONSTRAINT one_product_type CHECK (
    (card_id IS NOT NULL AND figurine_id IS NULL AND bundle_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NOT NULL AND bundle_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NULL AND bundle_id IS NOT NULL)
);

-- Update order_items constraint to include bundles
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS one_product_type;
ALTER TABLE order_items ADD CONSTRAINT one_product_type CHECK (
    (card_id IS NOT NULL AND figurine_id IS NULL AND bundle_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NOT NULL AND bundle_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NULL AND bundle_id IS NOT NULL)
);

-- Trigger to track price changes automatically
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.price_nzd != NEW.price_nzd) OR TG_OP = 'INSERT' THEN
        INSERT INTO price_history (card_id, price_nzd, reason)
        VALUES (NEW.id, NEW.price_nzd, CASE WHEN TG_OP = 'INSERT' THEN 'initial_price' ELSE 'manual_update' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_price_change_trigger
AFTER INSERT OR UPDATE ON cards
FOR EACH ROW
EXECUTE FUNCTION track_price_change();

-- Function to update set completion percentage
CREATE OR REPLACE FUNCTION update_set_completion()
RETURNS TRIGGER AS $$
DECLARE
    tracker_id INTEGER;
    owned INTEGER;
    total INTEGER;
BEGIN
    -- Find the set tracker for this user's collection item
    SELECT id, total_cards INTO tracker_id, total
    FROM set_trackers
    WHERE user_id = NEW.user_id
      AND set_name = NEW.set_name
      AND sport_type = NEW.sport_type;

    IF tracker_id IS NOT NULL THEN
        -- Count owned cards in this set
        SELECT COUNT(*) INTO owned
        FROM user_collections
        WHERE user_id = NEW.user_id
          AND set_name = NEW.set_name
          AND status = 'have';

        -- Update the tracker
        UPDATE set_trackers
        SET owned_count = owned,
            completion_percentage = (owned::DECIMAL / total * 100),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = tracker_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_set_completion_trigger
AFTER INSERT OR UPDATE ON user_collections
FOR EACH ROW
EXECUTE FUNCTION update_set_completion();

-- Create default admin user if not exists (password: admin123)
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@trulycollectables.com', '$2b$10$rGHQcLjN8P0LQx8JQHXZx.8WJvJGqLqGxQIY5Y3YQy8JQHXZx.8WJ', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert sample grading info
INSERT INTO grading_info (company, service_level, price_usd, price_nzd, turnaround_days, description) VALUES
('PSA', 'Regular Service', 25, 40, 65, 'Standard grading service for cards under $499 value'),
('PSA', 'Express Service', 75, 120, 20, 'Expedited service for faster turnaround'),
('PSA', 'Super Express', 150, 240, 5, 'Fastest service available'),
('BGS', 'Standard Service', 20, 32, 45, 'Standard Beckett grading with subgrades'),
('BGS', 'Premium Service', 50, 80, 20, 'Faster service with premium handling'),
('CGC', 'Standard Service', 22, 35, 50, 'CGC standard grading service'),
('SGC', 'Regular Service', 25, 40, 45, 'SGC standard grading')
ON CONFLICT DO NOTHING;

COMMIT;
