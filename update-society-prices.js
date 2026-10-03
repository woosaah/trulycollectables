const pool = require('./config/database');

const updates = [
    // Standard 9 Pocket Pages - C209D
    { name: 'Standard 9 Pocket Pages (C209D) - Single', society_price: 0.70 },
    { name: 'Standard 9 Pocket Pages (C209D) - Pack of 10', society_price: 6.60 },
    { name: 'Standard 9 Pocket Pages (C209D) - Box of 100', society_price: 61.50 },

    // Single Pocket Pages (full) - C211D
    { name: 'Single Pocket Pages Full (C211D) - Single', society_price: 1.00 },
    { name: 'Single Pocket Pages Full (C211D) - Pack of 10', society_price: 9.50 },
    { name: 'Single Pocket Pages Full (C211D) - Box of 100', society_price: 90.00 },

    // Single Pocket Pages - C201D
    { name: 'Single Pocket Pages (C201D) - Single', society_price: 0.70 },
    { name: 'Single Pocket Pages (C201D) - Pack of 10', society_price: 6.60 },

    // Ultra Clear Comic Storage Sleeve - UPR81697
    { name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Single', society_price: 0.85 },
    { name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Pack of 10', society_price: 8.00 },
    { name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Box of 100', society_price: 73.00 },

    // 2 Pocket Pages - C202D
    { name: '2 Pocket Pages (C202D) - Single', society_price: 1.00 },
    { name: '2 Pocket Pages (C202D) - Pack of 10', society_price: 9.50 },
    { name: '2 Pocket Pages (C202D) - Box of 100', society_price: 90.00 },

    // 3 Pocket Pages - C246D
    { name: '3 Pocket Pages (C246D) - Single', society_price: 0.85 },
    { name: '3 Pocket Pages (C246D) - Pack of 10', society_price: 8.00 },
    { name: '3 Pocket Pages (C246D) - Box of 100', society_price: 73.00 },

    // 3 Pocket Pages Banknotes - C203D
    { name: '3 Pocket Pages Banknotes (C203D) - Single', society_price: 0.85 },
    { name: '3 Pocket Pages Banknotes (C203D) - Pack of 10', society_price: 8.00 },
    { name: '3 Pocket Pages Banknotes (C203D) - Box of 100', society_price: 73.00 },

    // 4 Pocket Pages - C204D
    { name: '4 Pocket Pages (C204D) - Single', society_price: 0.85 },
    { name: '4 Pocket Pages (C204D) - Pack of 10', society_price: 8.00 },
    { name: '4 Pocket Pages (C204D) - Box of 100', society_price: 73.00 },

    // 6 Pocket Pages - C206D
    { name: '6 Pocket Pages (C206D) - Single', society_price: 0.85 },
    { name: '6 Pocket Pages (C206D) - Pack of 10', society_price: 8.00 },
    { name: '6 Pocket Pages (C206D) - Box of 100', society_price: 73.00 },

    // 8 Pocket Pages - C208D
    { name: '8 Pocket Pages (C208D) - Single', society_price: 0.85 },
    { name: '8 Pocket Pages (C208D) - Pack of 10', society_price: 8.00 },
    { name: '8 Pocket Pages (C208D) - Box of 100', society_price: 73.00 },

    // 12 Pocket Pages - C212D
    { name: '12 Pocket Pages (C212D) - Single', society_price: 1.00 },
    { name: '12 Pocket Pages (C212D) - Pack of 10', society_price: 9.50 },
    { name: '12 Pocket Pages (C212D) - Box of 100', society_price: 90.00 },

    // 15 Pocket Pages - C215D
    { name: '15 Pocket Pages (C215D) - Single', society_price: 0.85 },
    { name: '15 Pocket Pages (C215D) - Pack of 10', society_price: 8.00 },
    { name: '15 Pocket Pages (C215D) - Box of 100', society_price: 70.00 },

    // 20 Pocket Pog Pages
    { name: '20 Pocket Pog Pages - Single', society_price: 1.00 },

    // Single Sleeves
    { name: 'Single Sleeves 100 Pack (RPSCG-1)', society_price: 5.50 },

    // Binder
    { name: '50mm 3 Ring Binder Collector\'s Album', society_price: 24.00 },

    // Mini Snaptites
    { name: 'Mini Snaptites (81136) - Single', society_price: 1.80 },
    { name: 'Mini Snaptites (81136) - Sealed Pack of 5', society_price: 4.75 },

    // Top Loaders
    { name: 'Regular Clear Top Loaders 25ct Box (C81222)', society_price: 8.20 },
    { name: 'Top Loader 55pt', society_price: 12.00 },
    { name: 'Top Loader 75pt', society_price: 11.50 },

    // Screwdowns
    { name: 'Clear Screwdown 1/4" Recessed (C81140)', society_price: 3.00 },

    // Team Bags
    { name: 'Team Bags 100ct', society_price: 9.00 },

    // Deck Protectors
    { name: 'Deck Protectors 50ct', society_price: 8.50 },

    // Lucite Stand
    { name: 'Small Lucite Stand Card Holder 5 Pack', society_price: 5.50 },

    // Semi Rigid Sleeves
    { name: 'Semi Rigid 1/2" Lip Tall Sleeves - Single', society_price: 0.40 },
    { name: 'Semi Rigid 1/2" Lip Tall Sleeves - 200ct Box', society_price: 41.00 },

    // Card Sorting Tray
    { name: 'Card Sorting Tray 18 Compartment', society_price: 17.00 },

    // Sorting Trays
    { name: 'Top Loader/One Touch Single Sorting Trays (Pack of 6)', society_price: 15.00 },

    // 9-card Screwdown
    { name: '9-Card Screwdown', society_price: 33.00 },

    // Plastic Boxes
    { name: '25 Count Plastic Box - Single', society_price: 2.85 },
    { name: '25 Count Plastic Box - Joined Pair', society_price: 5.70 },
    { name: '50 Count Plastic Box (C81173) - Single', society_price: 3.35 },
    { name: '50 Count Plastic Box (C81173) - Joined Pair', society_price: 6.70 },
    { name: '100 Count Plastic Box (C81156)', society_price: 5.50 },
    { name: '150 Count Plastic Box', society_price: 5.20 },
    { name: '200 Count Plastic Box (C81149)', society_price: 5.85 },
    { name: '250 Count Plastic Box (C81148)', society_price: 7.00 },
];

async function run() {
    let updated = 0;
    let notFound = 0;

    // First: set ALL accessories quantity to 0
    const resetResult = await pool.query("UPDATE accessories SET quantity = 0 WHERE manufacturer = 'Ultra Pro'");
    console.log(`Reset stock to 0 for ${resetResult.rowCount} Ultra Pro products\n`);

    // Then: update society prices
    for (const u of updates) {
        const result = await pool.query(
            'UPDATE accessories SET society_price = $1 WHERE product_name = $2 RETURNING product_name, price_nzd',
            [u.society_price, u.name]
        );

        if (result.rows.length > 0) {
            const retail = parseFloat(result.rows[0].price_nzd);
            const saving = ((retail - u.society_price) / retail * 100).toFixed(0);
            console.log(`OK: ${u.name} — retail $${retail.toFixed(2)} → society $${u.society_price.toFixed(2)} (${saving}% off)`);
            updated++;
        } else {
            console.error(`NOT FOUND: ${u.name}`);
            notFound++;
        }
    }

    console.log(`\nDone: ${updated} updated, ${notFound} not found`);
    await pool.end();
}

run().catch(err => {
    console.error('Update failed:', err);
    pool.end();
    process.exit(1);
});
