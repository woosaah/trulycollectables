-- Enterprise Features - Additional Database Schema

-- Reviews and Ratings
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    ),
    CONSTRAINT unique_wishlist_item UNIQUE (user_id, card_id, figurine_id)
);

-- Discount Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'card', 'order', 'user', etc.
    entity_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles (extended user information)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    default_shipping_address TEXT,
    notification_preferences JSONB DEFAULT '{"email_orders": true, "email_promotions": false, "email_inventory": false}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(100) NOT NULL,
    search_params JSONB NOT NULL,
    notify_new_matches BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    figurine_id INTEGER REFERENCES figurines(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'restock'
    threshold INTEGER,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_product_type CHECK (
        (card_id IS NOT NULL AND figurine_id IS NULL) OR
        (card_id IS NULL AND figurine_id IS NOT NULL)
    )
);

-- Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template_name VARCHAR(100),
    template_data JSONB,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to existing orders table for coupons
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_nzd DECIMAL(10,2);

-- Add average rating cache to cards and figurines
ALTER TABLE cards ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE figurines ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE figurines ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_reviews_figurine_id ON reviews(figurine_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_notified ON inventory_alerts(notified);

-- Function to update average rating
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.card_id IS NOT NULL THEN
            UPDATE cards SET
                average_rating = (SELECT AVG(rating) FROM reviews WHERE card_id = NEW.card_id AND approved = true),
                review_count = (SELECT COUNT(*) FROM reviews WHERE card_id = NEW.card_id AND approved = true)
            WHERE id = NEW.card_id;
        ELSIF NEW.figurine_id IS NOT NULL THEN
            UPDATE figurines SET
                average_rating = (SELECT AVG(rating) FROM reviews WHERE figurine_id = NEW.figurine_id AND approved = true),
                review_count = (SELECT COUNT(*) FROM reviews WHERE figurine_id = NEW.figurine_id AND approved = true)
            WHERE id = NEW.figurine_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.card_id IS NOT NULL THEN
            UPDATE cards SET
                average_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE card_id = OLD.card_id AND approved = true),
                review_count = (SELECT COUNT(*) FROM reviews WHERE card_id = OLD.card_id AND approved = true)
            WHERE id = OLD.card_id;
        ELSIF OLD.figurine_id IS NOT NULL THEN
            UPDATE figurines SET
                average_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE figurine_id = OLD.figurine_id AND approved = true),
                review_count = (SELECT COUNT(*) FROM reviews WHERE figurine_id = OLD.figurine_id AND approved = true)
            WHERE id = OLD.figurine_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update average rating
DROP TRIGGER IF EXISTS trigger_update_rating ON reviews;
CREATE TRIGGER trigger_update_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_average_rating();
