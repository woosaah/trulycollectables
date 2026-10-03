const CsvImport = require('./models/CsvImport');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'F1cards/turbo-attax-2025.csv');
const ADMIN_USER_ID = 1;

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
            .on('data', row => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

(async () => {
    try {
        console.log('Parsing CSV...');
        const rawRows = await parseCSV(CSV_PATH);

        const rows = rawRows.map(row => ({
            ...CsvImport.mapRow(row, {}),
            price_nzd: '0.00',
            quantity: '1'
        }));

        console.log(`${rows.length} rows ready to import`);

        const result = await CsvImport.importCards(rows, ADMIN_USER_ID, 'turbo-attax-2025.csv', 'skip');

        console.log(`\nDone.`);
        console.log(`  Imported: ${result.imported || result.successful}`);
        console.log(`  Skipped:  ${result.skipped}`);
        console.log(`  Errors:   ${result.failed || 0}`);
        if (result.errors && result.errors.length > 0) {
            result.errors.slice(0, 10).forEach(e => console.log(`    ${e.card_name}: ${e.error}`));
        }

        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();
