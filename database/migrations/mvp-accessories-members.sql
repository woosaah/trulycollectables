-- MVP Migration: Accessories-focused store with society member pricing
-- Run with: psql trulycollectables < database/migrations/mvp-accessories-members.sql

-- 1. Add society_price to accessories
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS society_price DECIMAL(10,2);

-- 2. Add society membership to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_society_member BOOLEAN DEFAULT false;

-- 3. Add accessory_id to cart, update constraint
ALTER TABLE cart ADD COLUMN IF NOT EXISTS accessory_id INTEGER REFERENCES accessories(id) ON DELETE CASCADE;
ALTER TABLE cart DROP CONSTRAINT IF EXISTS one_product_type;
ALTER TABLE cart ADD CONSTRAINT one_product_type CHECK (
    (card_id IS NOT NULL AND figurine_id IS NULL AND accessory_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NOT NULL AND accessory_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NULL AND accessory_id IS NOT NULL)
);

-- 4. Add accessory_id to order_items, update constraint
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS accessory_id INTEGER REFERENCES accessories(id);
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS one_product_type;
ALTER TABLE order_items ADD CONSTRAINT order_items_one_product_type CHECK (
    (card_id IS NOT NULL AND figurine_id IS NULL AND accessory_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NOT NULL AND accessory_id IS NULL) OR
    (card_id IS NULL AND figurine_id IS NULL AND accessory_id IS NOT NULL)
);

-- 5. Add subtotal and discount columns to orders if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_nzd DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER;

-- 6. Index for cart accessory lookups
CREATE INDEX IF NOT EXISTS idx_cart_accessory_id ON cart(accessory_id);
CREATE INDEX IF NOT EXISTS idx_order_items_accessory_id ON order_items(accessory_id);

-- 7. Backfill society_price as 10% off retail for existing accessories
UPDATE accessories SET society_price = ROUND(price_nzd * 0.90, 2) WHERE society_price IS NULL AND price_nzd IS NOT NULL;
