-- Card parallels / variations table
CREATE TABLE IF NOT EXISTS card_variations (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    variation_name VARCHAR(100) NOT NULL,
    price_nzd DECIMAL(10,2) DEFAULT 0.00,
    quantity INTEGER DEFAULT 0,
    condition VARCHAR(50),
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(card_id, variation_name)
);

-- Add variation tracking to cart, order_items, and user_collections
ALTER TABLE cart ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES card_variations(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES card_variations(id) ON DELETE SET NULL;
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES card_variations(id) ON DELETE SET NULL;

-- Replace old unique index with two partial indexes that handle base vs variation separately
-- (NULL != NULL in unique indexes, so we need separate indexes for null and non-null variation_id)
DROP INDEX IF EXISTS idx_user_collections_user_card_have;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collections_base_have
    ON user_collections(user_id, card_id)
    WHERE card_id IS NOT NULL AND variation_id IS NULL AND status = 'have';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collections_variation_have
    ON user_collections(user_id, card_id, variation_id)
    WHERE card_id IS NOT NULL AND variation_id IS NOT NULL AND status = 'have';
