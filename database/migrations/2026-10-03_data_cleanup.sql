-- Catalogue data cleanup — 2026-10-03
-- Backup taken first: /mnt/storage/backups/trulycollectables/pre-cleanup-2026-10-03.dump
-- Canonical set naming: "<year> <manufacturer> <product>" (matches 2026 Topps Turbo Attax Formula 1)
-- Run inside a transaction; the caller decides COMMIT vs ROLLBACK.

-- ── 1. Set rename map ──────────────────────────────────────────────
CREATE TEMP TABLE set_map (old_name text PRIMARY KEY, new_name text NOT NULL) ON COMMIT DROP;
INSERT INTO set_map VALUES
  ('F1 Turbo Attax 2025',                        '2025 Topps Turbo Attax Formula 1'),
  ('2025 F1 Attax',                              '2025 Topps Turbo Attax Formula 1'),
  ('Topps turbo attax',                          '2024 Topps Turbo Attax Formula 1'),
  ('Topps turbo attax 2024',                     '2024 Topps Turbo Attax Formula 1'),
  ('NBL Basketball Series I',                    '1994 Futera NBL Series 1'),
  ('NBL Basketball Series II',                   '1994 Futera NBL Series 2'),
  ('2023 cricket Australia',                     '2023 Cricket Australia'),
  ('2025-2026 cricket australia',                '2025-2026 Cricket Australia'),
  ('2022-2023 cricket australia',                '2022-2023 Cricket Australia'),
  ('2022-2023 cricket austrailla',               '2022-2023 Cricket Australia'),
  ('cricket 2024',                               '2024 Cricket Australia'),
  ('hoops',                                      '1990 NBA Hoops'),
  ('80 hoops',                                   '1990 NBA Hoops'),
  ('Star Wars Attack of the Clones',             '2002 Topps Star Wars Attack of the Clones'),
  ('Star Wars Attack of the Clones Silver Foil', '2002 Topps Star Wars Attack of the Clones'),
  ('star wars topps chrome archives',            '1999 Topps Star Wars Chrome Archives'),
  ('NRL Invincible',                             '2007 Select NRL Invincible'),
  ('NRL Centenary',                              '2008 Select NRL Centenary'),
  ('NRL Classic',                                '2009 Select NRL Classic'),
  ('NRL Strike',                                 '2011 Select NRL Strike'),
  ('AFL Australian Rules Football',              '1992 Regina AFL');

-- Sets that need splitting rather than a straight rename
UPDATE cards SET set_name = '1994 Futera NBL Series 1', insert_list = 'Base Set'
 WHERE set_name = 'NBL Basketball Series' AND insert_list = 'Base Set Series I';
UPDATE cards SET set_name = '1994 Futera NBL Series 2', insert_list = 'Base Set'
 WHERE set_name = 'NBL Basketball Series' AND insert_list = 'Base Set Series II';
UPDATE cards SET set_name = year || ' Futera NBL'
 WHERE set_name = 'NBL Basketball' AND year IN (1995, 1996);

UPDATE cards c SET set_name = m.new_name FROM set_map m WHERE c.set_name = m.old_name;
UPDATE pending_cards p SET set_name = m.new_name FROM set_map m WHERE p.set_name = m.old_name;

-- sets / card_sets have UNIQUE set_name: drop the old row when the new name already exists, else rename
DELETE FROM sets s USING set_map m
 WHERE s.set_name = m.old_name AND EXISTS (SELECT 1 FROM sets x WHERE x.set_name = m.new_name);
UPDATE sets s SET set_name = m.new_name FROM set_map m WHERE s.set_name = m.old_name
   AND s.id = (SELECT min(id) FROM sets WHERE set_name IN (SELECT old_name FROM set_map WHERE new_name = m.new_name));
DELETE FROM sets s USING set_map m WHERE s.set_name = m.old_name;

DELETE FROM card_sets cs USING set_map m
 WHERE cs.set_name = m.old_name AND EXISTS (SELECT 1 FROM card_sets x WHERE x.set_name = m.new_name);
UPDATE card_sets cs SET set_name = m.new_name FROM set_map m WHERE cs.set_name = m.old_name
   AND cs.id = (SELECT min(id) FROM card_sets WHERE set_name IN (SELECT old_name FROM set_map WHERE new_name = m.new_name));
DELETE FROM card_sets cs USING set_map m WHERE cs.set_name = m.old_name;
DELETE FROM card_sets WHERE set_name IN ('NBL Basketball Series', 'NBL Basketball', '2022', '2024 Test Set');

-- ── 2. Card-level fixes ────────────────────────────────────────────
-- Star Wars: everything here came from the Silver Foil subset; fill sport
UPDATE cards SET insert_list = 'Silver Foil', sport_type = 'Star Wars'
 WHERE set_name = '2002 Topps Star Wars Attack of the Clones';
UPDATE cards SET card_name = 'Luke Skywalker', insert_list = 'Clear Zone', sport_type = 'Star Wars'
 WHERE id = 1955;

-- Stray 2025 F1 cards with blank set (blanked by the old edit-form bug)
UPDATE cards SET set_name = '2025 Topps Turbo Attax Formula 1' WHERE id IN (556, 648, 1898);

-- Duplicate Lance Stroll #319 Diamond Pull: keep 610 (has collection refs), take 1941's stock
UPDATE cards SET quantity = 1, price_nzd = 24.00, available = true WHERE id = 610;
DELETE FROM cards WHERE id = 1941;

-- Manufacturer casing
UPDATE cards SET manufacturer = 'Cricket Australia' WHERE manufacturer = 'cricket Australia';
UPDATE cards SET manufacturer = 'NBA Hoops' WHERE manufacturer = 'hoops';
UPDATE sets  SET manufacturer = 'Cricket Australia' WHERE manufacturer = 'cricket Australia';
UPDATE sets  SET manufacturer = 'NBA Hoops' WHERE manufacturer ILIKE 'hoops';
UPDATE manufacturers SET name = 'Cricket Australia' WHERE name = 'cricket Australia';
UPDATE manufacturers SET name = 'NBA Hoops' WHERE name = 'hoops';

-- ── 3. Variations ──────────────────────────────────────────────────
UPDATE card_variations SET variation_name = 'silver parallel' WHERE variation_name = 'sillver';
UPDATE set_parallels   SET variation_name = 'silver parallel' WHERE variation_name = 'sillver';
-- Card 573 has both 'Pink' (real stock: qty 1, $5, photo) and an empty 'pink parallel' — fold into the latter
UPDATE card_variations t SET quantity = s.quantity, price_nzd = s.price_nzd, image_url = s.image_url, updated_at = now()
  FROM card_variations s WHERE s.card_id = 573 AND s.variation_name = 'Pink'
   AND t.card_id = 573 AND t.variation_name = 'pink parallel';
DELETE FROM card_variations WHERE card_id = 573 AND variation_name = 'Pink';

-- ── 4. Every card set gets a sets row + a card_sets row (drives the edit-form dropdown) ──
INSERT INTO sets (set_name, manufacturer, year, sport_type, card_category)
SELECT set_name, max(manufacturer), min(year), max(sport_type), max(card_category)
  FROM cards WHERE coalesce(set_name, '') <> ''
   AND set_name NOT IN (SELECT set_name FROM sets)
 GROUP BY set_name;

INSERT INTO manufacturers (name)
SELECT DISTINCT c.manufacturer FROM cards c
 WHERE coalesce(c.manufacturer, '') <> ''
   AND NOT EXISTS (SELECT 1 FROM manufacturers m WHERE lower(m.name) = lower(c.manufacturer));

INSERT INTO card_sets (manufacturer_id, set_name, year)
SELECT m.id, c.set_name, min(c.year)
  FROM cards c JOIN manufacturers m ON lower(m.name) = lower(c.manufacturer)
 WHERE coalesce(c.set_name, '') <> '' AND c.set_name NOT IN (SELECT set_name FROM card_sets)
 GROUP BY m.id, c.set_name;

-- ── 5. Re-sync denormalised collection fields from the card they point at ──
UPDATE user_collections uc
   SET card_name = c.card_name, set_name = c.set_name, card_number = c.card_number,
       manufacturer = c.manufacturer, insert_list = c.insert_list, year = c.year, sport_type = c.sport_type
  FROM cards c
 WHERE uc.card_id = c.id
   AND (uc.set_name, uc.card_name, uc.card_number, uc.manufacturer, uc.insert_list, uc.year, uc.sport_type)
       IS DISTINCT FROM (c.set_name, c.card_name, c.card_number, c.manufacturer, c.insert_list, c.year, c.sport_type);
