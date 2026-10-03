'use strict';
const pool = require('../config/database');

const SET_NAME = '2026 Woolworths Disney Ooshies';
const SUPPLIER = 'Woolworths';

const figures = [
    // Disney
    { num: '1',  name: 'Moana',             franchise: 'Disney' },
    { num: '2',  name: 'Maui',              franchise: 'Disney' },
    { num: '3',  name: 'Pua',               franchise: 'Disney' },
    { num: '4',  name: 'Hei Hei',           franchise: 'Disney' },
    { num: '5',  name: 'Kakamora',          franchise: 'Disney' },
    { num: '6',  name: 'Elsa',              franchise: 'Disney' },
    { num: '7',  name: 'Anna',              franchise: 'Disney' },
    { num: '8',  name: 'Stitch',            franchise: 'Disney' },
    { num: '9',  name: 'Lilo',              franchise: 'Disney' },
    { num: '10', name: 'Judy Hopps',        franchise: 'Disney' },
    { num: '15', name: 'Lilypad',           franchise: 'Disney' },
    // Pixar
    { num: '11', name: 'Jessie',            franchise: 'Pixar' },
    { num: '12', name: 'Woody',             franchise: 'Pixar' },
    { num: '13', name: 'Buzz Lightyear',    franchise: 'Pixar' },
    { num: '14', name: 'Bullseye',          franchise: 'Pixar' },
    { num: '16', name: 'Mike Wazowski',     franchise: 'Pixar' },
    { num: '17', name: 'Anxiety',           franchise: 'Pixar' },
    { num: '18', name: 'Sulley',            franchise: 'Pixar' },
    { num: '19', name: 'Joy',               franchise: 'Pixar' },
    { num: '20', name: 'Lightning McQueen', franchise: 'Pixar' },
    // Marvel
    { num: '21', name: 'Spider-Man',        franchise: 'Marvel' },
    { num: '22', name: 'Hulk',              franchise: 'Marvel' },
    { num: '23', name: 'Tombstone',         franchise: 'Marvel' },
    { num: '24', name: 'Scorpion',          franchise: 'Marvel' },
    { num: '25', name: 'Tarantula',         franchise: 'Marvel' },
    { num: '26', name: 'The Thing',         franchise: 'Marvel' },
    { num: '27', name: 'Wolverine',         franchise: 'Marvel' },
    { num: '28', name: 'Doctor Doom',       franchise: 'Marvel' },
    { num: '29', name: 'Thor',              franchise: 'Marvel' },
    { num: '30', name: 'Gambit',            franchise: 'Marvel' },
    // Star Wars
    { num: '31', name: 'Mandalorian',       franchise: 'Star Wars' },
    { num: '32', name: 'Grogu',             franchise: 'Star Wars' },
    { num: '33', name: 'Anzellan',          franchise: 'Star Wars' },
    { num: '34', name: 'Zeb',               franchise: 'Star Wars' },
    { num: '35', name: 'Stormtrooper',      franchise: 'Star Wars' },
    { num: '36', name: 'Darth Vader',       franchise: 'Star Wars' },
    { num: '37', name: 'C-3PO',             franchise: 'Star Wars' },
    { num: '38', name: 'Princess Leia',     franchise: 'Star Wars' },
    { num: '39', name: 'Luke Skywalker',    franchise: 'Star Wars' },
    { num: '40', name: 'R2-D2',             franchise: 'Star Wars' },
];

async function run() {
    const existing = await pool.query(
        "SELECT COUNT(*) FROM figurines WHERE supplier = $1 AND product_name LIKE 'Disney Ooshies%'",
        [SUPPLIER]
    );
    const count = parseInt(existing.rows[0].count);
    if (count > 0) {
        console.log(`Already have ${count} Ooshies figurines — skipping. Delete them first to re-import.`);
        await pool.end();
        return;
    }

    let imported = 0;
    let failed = 0;

    for (const fig of figures) {
        const productName = `Disney Ooshies #${fig.num} — ${fig.name}`;
        const description = `${SET_NAME} | ${fig.franchise}`;
        const sku = `OOSHIES-${fig.num.padStart(2, '0')}`;

        try {
            await pool.query(`
                INSERT INTO figurines (product_name, description, supplier, sku, quantity, available, approved)
                VALUES ($1, $2, $3, $4, 0, true, true)
            `, [productName, description, SUPPLIER, sku]);
            console.log(`  ✓ ${fig.num}. ${fig.name} (${fig.franchise})`);
            imported++;
        } catch (err) {
            console.error(`  ✗ FAIL [${fig.num} ${fig.name}]: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nImported: ${imported} | Failed: ${failed}`);
    await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
