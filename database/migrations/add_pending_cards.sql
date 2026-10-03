-- Pending cards submitted by users (shared pool, not per-user)
CREATE TABLE IF NOT EXISTS pending_cards (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    set_name VARCHAR(255),
    card_number VARCHAR(50),
    manufacturer VARCHAR(100),
    insert_list VARCHAR(255),
    year INTEGER,
    card_category VARCHAR(20) DEFAULT 'non_sport',
    sport_type VARCHAR(50),
    notes TEXT,
    image_front TEXT,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_cards_name ON pending_cards(LOWER(card_name));

-- Link user_collections entries to pending cards
ALTER TABLE user_collections
    ADD COLUMN IF NOT EXISTS pending_card_id INTEGER REFERENCES pending_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_collections_pending_card_id ON user_collections(pending_card_id);

-- Prevent a user adding the same pending card twice for the same status
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collections_user_pending_status
    ON user_collections(user_id, pending_card_id, status)
    WHERE pending_card_id IS NOT NULL;
