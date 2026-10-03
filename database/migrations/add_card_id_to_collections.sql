ALTER TABLE user_collections
    ADD COLUMN IF NOT EXISTS card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collections_user_card_have
    ON user_collections(user_id, card_id)
    WHERE card_id IS NOT NULL AND status = 'have';
