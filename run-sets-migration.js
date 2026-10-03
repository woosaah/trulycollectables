const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running sets table migration...');

        const sqlPath = path.join(__dirname, 'database', 'create_sets_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✓ Sets table created successfully');
        console.log('✓ Indexes created');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
