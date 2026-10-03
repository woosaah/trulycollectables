-- Create sets table with image support
CREATE TABLE IF NOT EXISTS sets (
    id SERIAL PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL UNIQUE,
    manufacturer VARCHAR(100),
    year INTEGER,
    sport_type VARCHAR(50),
    card_category VARCHAR(20), -- 'sport' or 'non_sport'
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sets_sport_type ON sets(sport_type);
CREATE INDEX IF NOT EXISTS idx_sets_manufacturer ON sets(manufacturer);
CREATE INDEX IF NOT EXISTS idx_sets_card_category ON sets(card_category);
