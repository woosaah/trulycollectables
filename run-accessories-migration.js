// Migration script to add accessories table
const pool = require('./config/database');

async function runMigration() {
  try {
    console.log('Starting migration: Add accessories table...');

    // Create accessories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accessories (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        price_nzd DECIMAL(10,2),
        quantity INTEGER DEFAULT 1,
        image_url TEXT,
        manufacturer VARCHAR(100),
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created accessories table');

    // Create index for category
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_accessories_category ON accessories(category)
    `);
    console.log('✓ Created index on category');

    // Create index for available
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_accessories_available ON accessories(available)
    `);
    console.log('✓ Created index on available');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
