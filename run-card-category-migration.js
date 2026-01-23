// Migration script to add card_category field
const pool = require('./config/database');

async function runMigration() {
  try {
    console.log('Starting migration: Add card_category field...');

    // Add column
    await pool.query(`
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_category VARCHAR(20)
    `);
    console.log('✓ Added card_category column');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(card_category)
    `);
    console.log('✓ Created index on card_category');

    // Update sport cards
    await pool.query(`
      UPDATE cards SET card_category = 'sport'
      WHERE card_category IS NULL
      AND sport_type IN ('Basketball', 'Baseball', 'Football', 'American Football', 'Cricket', 'Rugby', 'Rugby League', 'Soccer', 'Hockey', 'Tennis', 'Golf', 'Racing', 'F1', 'NASCAR', 'AFL', 'NRL')
    `);
    console.log('✓ Updated sport cards');

    // Update non-sport cards
    await pool.query(`
      UPDATE cards SET card_category = 'non_sport'
      WHERE card_category IS NULL
      AND sport_type IN ('Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh', 'Magic', 'Other')
    `);
    console.log('✓ Updated non-sport cards');

    // Default remaining to non_sport
    const result = await pool.query(`
      UPDATE cards SET card_category = 'non_sport' WHERE card_category IS NULL
    `);
    console.log(`✓ Set default category for ${result.rowCount} remaining cards`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
