-- Migration: Add players table and new card fields
-- Run with: psql trulycollectables < database/migrations/add_players_and_card_fields.sql

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    born_in_nz BOOLEAN DEFAULT false,
    sports_played TEXT[] DEFAULT '{}',
    played_for_all_blacks BOOLEAN DEFAULT false,
    played_for_maori BOOLEAN DEFAULT false,
    played_for_kiwis BOOLEAN DEFAULT false,
    played_for_maori_rl BOOLEAN DEFAULT false,
    played_for_black_caps BOOLEAN DEFAULT false,
    played_for_white_ferns BOOLEAN DEFAULT false,
    played_for_tall_blacks BOOLEAN DEFAULT false,
    played_for_other BOOLEAN DEFAULT false,
    other_teams TEXT,
    image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_sports ON players USING GIN(sports_played);

-- New card fields
ALTER TABLE cards ADD COLUMN IF NOT EXISTS team VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS variation VARCHAR(100);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_rookie_card BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'single';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cards_team ON cards(team);
CREATE INDEX IF NOT EXISTS idx_cards_product_type ON cards(product_type);
CREATE INDEX IF NOT EXISTS idx_cards_player_id ON cards(player_id);
CREATE INDEX IF NOT EXISTS idx_cards_is_rookie ON cards(is_rookie_card) WHERE is_rookie_card = true;

-- Variation options reference: Error, Correction, UER, Short Print, Other
-- Product type options: single, pack, box
-- Sports played options: Cricket, Rugby, Rugby League, Rugby Sevens, Boxing, Other
