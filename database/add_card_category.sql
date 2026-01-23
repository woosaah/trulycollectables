-- Add card_category column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_category VARCHAR(20);

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(card_category);

-- Optional: Set default values based on existing sport_type
-- Sport categories
UPDATE cards SET card_category = 'sport' 
WHERE card_category IS NULL 
AND sport_type IN ('Basketball', 'Baseball', 'Football', 'American Football', 'Cricket', 'Rugby', 'Rugby League', 'Soccer', 'Hockey', 'Tennis', 'Golf', 'Racing', 'F1', 'NASCAR', 'AFL', 'NRL');

-- Non-sport categories
UPDATE cards SET card_category = 'non_sport' 
WHERE card_category IS NULL 
AND sport_type IN ('Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh', 'Magic', 'Other');

-- Default to non_sport for anything else
UPDATE cards SET card_category = 'non_sport' WHERE card_category IS NULL;
