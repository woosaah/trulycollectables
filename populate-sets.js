const pool = require('./config/database');

async function populateSets() {
    try {
        console.log('Populating sets table from existing cards...');

        // Get distinct sets from cards table
        const query = `
            SELECT DISTINCT
                set_name,
                manufacturer,
                year,
                sport_type,
                card_category
            FROM cards
            WHERE set_name IS NOT NULL
            ORDER BY set_name
        `;

        const result = await pool.query(query);
        console.log(`Found ${result.rows.length} unique sets in cards table`);

        let inserted = 0;
        let skipped = 0;

        for (const row of result.rows) {
            try {
                await pool.query(
                    `INSERT INTO sets (set_name, manufacturer, year, sport_type, card_category)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (set_name) DO NOTHING`,
                    [row.set_name, row.manufacturer, row.year, row.sport_type, row.card_category]
                );
                inserted++;
                console.log(`✓ Added: ${row.set_name}`);
            } catch (error) {
                skipped++;
                console.log(`⊘ Skipped: ${row.set_name} (${error.message})`);
            }
        }

        console.log(`\n✓ Complete! Inserted: ${inserted}, Skipped: ${skipped}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

populateSets();
