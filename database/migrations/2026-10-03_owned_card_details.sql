-- Owned-card details on user_collections — 2026-10-03
-- Grading, purchase info, and where the card physically is.

ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS condition        VARCHAR(50);
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS is_graded        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS grade_company    VARCHAR(30);
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS grade_value      VARCHAR(10);
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS cert_number      VARCHAR(50);
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS price_paid       NUMERIC(10,2);
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS date_purchased   DATE;
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS ownership_status VARCHAR(20) NOT NULL DEFAULT 'in_collection';

DO $$ BEGIN
    ALTER TABLE user_collections ADD CONSTRAINT user_collections_ownership_status_check
        CHECK (ownership_status IN ('in_collection', 'in_transit', 'for_sale', 'sold'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_collections_in_transit
    ON user_collections (user_id) WHERE ownership_status = 'in_transit';
