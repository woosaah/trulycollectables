const pool = require('./config/database');

const products = [
    // === ULTRA PRO PAGES (All pages fit any standard 3 ring binder, archival safe) ===

    // Standard 9 Pocket Pages - C209D
    { product_name: 'Standard 9 Pocket Pages (C209D) - Single', category: 'Pages', description: 'Standard sized cards, 64mm x 89mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.85, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Standard 9 Pocket Pages (C209D) - Pack of 10', category: 'Pages', description: 'Standard sized cards, 64mm x 89mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.00, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Standard 9 Pocket Pages (C209D) - Box of 100', category: 'Pages', description: 'Standard sized cards, 64mm x 89mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 75.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // Single Pocket Pages (full) - C211D - OUT OF STOCK
    { product_name: 'Single Pocket Pages Full (C211D) - Single', category: 'Pages', description: 'Magazines, 216mm x 280mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 1.10, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: 'Single Pocket Pages Full (C211D) - Pack of 10', category: 'Pages', description: 'Magazines, 216mm x 280mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 10.50, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: 'Single Pocket Pages Full (C211D) - Box of 100', category: 'Pages', description: 'Magazines, 216mm x 280mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 100.00, quantity: 0, manufacturer: 'Ultra Pro', available: false },

    // Single Pocket Pages - C201D - OUT OF STOCK
    { product_name: 'Single Pocket Pages (C201D) - Single', category: 'Pages', description: '8x10" photos, Master Vision Cards, etc. 203mm x 254mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: 'Single Pocket Pages (C201D) - Pack of 10', category: 'Pages', description: '8x10" photos, Master Vision Cards, etc. 203mm x 254mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 0, manufacturer: 'Ultra Pro', available: false },

    // Ultra Clear Comic Storage Sleeve - UPR81697 - NEW
    { product_name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Single', category: 'Sleeves', description: 'Comics - 3 ring binder compatible, resealable flap closure. 184.15mm x 266.7mm. NEW!', price_nzd: 0.90, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Pack of 10', category: 'Sleeves', description: 'Comics - 3 ring binder compatible, resealable flap closure. 184.15mm x 266.7mm. NEW!', price_nzd: 8.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Ultra Clear Comic Storage Sleeve (UPR81697) - Box of 100', category: 'Sleeves', description: 'Comics - 3 ring binder compatible, resealable flap closure. 184.15mm x 266.7mm. NEW!', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 2 Pocket Pages - C202D - OUT OF STOCK
    { product_name: '2 Pocket Pages (C202D) - Single', category: 'Pages', description: 'Postcard sized cards, 127mm x 179mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 1.10, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: '2 Pocket Pages (C202D) - Pack of 10', category: 'Pages', description: 'Postcard sized cards, 127mm x 179mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 10.50, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: '2 Pocket Pages (C202D) - Box of 100', category: 'Pages', description: 'Postcard sized cards, 127mm x 179mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 100.00, quantity: 0, manufacturer: 'Ultra Pro', available: false },

    // 3 Pocket Pages - C246D
    { product_name: '3 Pocket Pages (C246D) - Single', category: 'Pages', description: 'Postcard or photograph sized cards (6x4"), 102mm x 153mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '3 Pocket Pages (C246D) - Pack of 10', category: 'Pages', description: 'Postcard or photograph sized cards (6x4"), 102mm x 153mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '3 Pocket Pages (C246D) - Box of 100', category: 'Pages', description: 'Postcard or photograph sized cards (6x4"), 102mm x 153mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 3 Pocket Pages - C203D - OUT OF STOCK
    { product_name: '3 Pocket Pages Banknotes (C203D) - Single', category: 'Pages', description: 'Suitable for Banknotes, 94mm x 207mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: '3 Pocket Pages Banknotes (C203D) - Pack of 10', category: 'Pages', description: 'Suitable for Banknotes, 94mm x 207mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 0, manufacturer: 'Ultra Pro', available: false },
    { product_name: '3 Pocket Pages Banknotes (C203D) - Box of 100', category: 'Pages', description: 'Suitable for Banknotes, 94mm x 207mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 0, manufacturer: 'Ultra Pro', available: false },

    // 4 Pocket Pages - C204D
    { product_name: '4 Pocket Pages (C204D) - Single', category: 'Pages', description: 'Small Postcard sized cards, 89mm x 127mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '4 Pocket Pages (C204D) - Pack of 10', category: 'Pages', description: 'Small Postcard sized cards, 89mm x 127mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '4 Pocket Pages (C204D) - Box of 100', category: 'Pages', description: 'Small Postcard sized cards, 89mm x 127mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 6 Pocket Pages - C206D
    { product_name: '6 Pocket Pages (C206D) - Single', category: 'Pages', description: 'Long cards eg Wide Vision, 64mm x 134mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '6 Pocket Pages (C206D) - Pack of 10', category: 'Pages', description: 'Long cards eg Wide Vision, 64mm x 134mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '6 Pocket Pages (C206D) - Box of 100', category: 'Pages', description: 'Long cards eg Wide Vision, 64mm x 134mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 8 Pocket Pages - C208D
    { product_name: '8 Pocket Pages (C208D) - Single', category: 'Pages', description: 'Holds 8 cards, 69mm x 98mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 1.20, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '8 Pocket Pages (C208D) - Pack of 10', category: 'Pages', description: 'Holds 8 cards, 69mm x 98mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 11.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '8 Pocket Pages (C208D) - Box of 100', category: 'Pages', description: 'Holds 8 cards, 69mm x 98mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 12 Pocket Pages - C212D
    { product_name: '12 Pocket Pages (C212D) - Single', category: 'Pages', description: 'Stickers, 51mm x 57mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.85, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '12 Pocket Pages (C212D) - Pack of 10', category: 'Pages', description: 'Stickers, 51mm x 57mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.00, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '12 Pocket Pages (C212D) - Box of 100', category: 'Pages', description: 'Stickers, 51mm x 57mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 75.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 15 Pocket Pages - C215D
    { product_name: '15 Pocket Pages (C215D) - Single', category: 'Pages', description: 'Cigarette Cards and Yowie Papers, 38mm x 90mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 0.90, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '15 Pocket Pages (C215D) - Pack of 10', category: 'Pages', description: 'Cigarette Cards and Yowie Papers, 38mm x 90mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 8.50, quantity: 100, manufacturer: 'Ultra Pro', available: true },
    { product_name: '15 Pocket Pages (C215D) - Box of 100', category: 'Pages', description: 'Cigarette Cards and Yowie Papers, 38mm x 90mm. Archival safe, fits any standard 3 ring binder.', price_nzd: 80.00, quantity: 10, manufacturer: 'Ultra Pro', available: true },

    // 20 Pocket Pog Pages
    { product_name: '20 Pocket Pog Pages - Single', category: 'Pages', description: 'Medallions and Caps/Tazos. Archival safe, fits any standard 3 ring binder.', price_nzd: 1.20, quantity: 100, manufacturer: 'Ultra Pro', available: true },

    // Packet 100 Single Sleeves - RPSCG-1
    { product_name: 'Single Sleeves 100 Pack (RPSCG-1)', category: 'Sleeves', description: 'Standard size cards only - top loading. Pack of 100.', price_nzd: 6.30, quantity: 50, manufacturer: 'Ultra Pro', available: true },

    // 50mm 3 'D' Ring Binder
    { product_name: '50mm 3 Ring Binder Collector\'s Album', category: 'Binders', description: 'Navy or Black - Padded Vinyl. 50mm 3 \'D\' Ring Binder.', price_nzd: 25.00, quantity: 20, manufacturer: 'Ultra Pro', available: true },

    // === ULTRA PRO / PKK PLASTIC PRODUCTS ===

    // Mini Snaptites
    { product_name: 'Mini Snaptites (81136) - Single', category: 'Protectors', description: 'Mini Snaptite card holder.', price_nzd: 1.80, quantity: 50, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Mini Snaptites (81136) - Sealed Pack of 5', category: 'Protectors', description: 'Mini Snaptite card holders. Sealed pack of 5.', price_nzd: 4.80, quantity: 20, manufacturer: 'Ultra Pro', available: true },

    // Top Loaders
    { product_name: 'Regular Clear Top Loaders 25ct Box (C81222)', category: 'Protectors', description: 'Ultra Pro Regular Clear Top Loaders - 25 count box.', price_nzd: 8.85, quantity: 50, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Top Loader 55pt', category: 'Protectors', description: 'Ultra Pro Top Loader 55pt thickness.', price_nzd: 12.50, quantity: 30, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Top Loader 75pt', category: 'Protectors', description: 'Ultra Pro Top Loader 75pt thickness.', price_nzd: 12.25, quantity: 30, manufacturer: 'Ultra Pro', available: true },

    // Screwdowns
    { product_name: 'Clear Screwdown 1/4" Recessed (C81140)', category: 'Protectors', description: 'Ultra Pro Clear Screwdowns 1/4" - recessed.', price_nzd: 3.30, quantity: 30, manufacturer: 'Ultra Pro', available: true },

    // Team Bags
    { product_name: 'Team Bags 100ct', category: 'Sleeves', description: 'Ultra Pro Team Bags - 100 count.', price_nzd: 9.50, quantity: 30, manufacturer: 'Ultra Pro', available: true },

    // Deck Protectors
    { product_name: 'Deck Protectors 50ct', category: 'Sleeves', description: 'Ultra Pro Deck Protectors - 50 count.', price_nzd: 9.50, quantity: 30, manufacturer: 'Ultra Pro', available: true },

    // Lucite Stand
    { product_name: 'Small Lucite Stand Card Holder 5 Pack', category: 'Display Cases', description: 'Ultra Pro Small Lucite Stand Card Holder - pack of 5.', price_nzd: 6.30, quantity: 20, manufacturer: 'Ultra Pro', available: true },

    // Semi Rigid Sleeves
    { product_name: 'Semi Rigid 1/2" Lip Tall Sleeves - Single', category: 'Sleeves', description: '80.9mm x 107.9mm. One box only.', price_nzd: 0.50, quantity: 200, manufacturer: 'Ultra Pro', available: true },
    { product_name: 'Semi Rigid 1/2" Lip Tall Sleeves - 200ct Box', category: 'Sleeves', description: '80.9mm x 107.9mm. One box only.', price_nzd: 50.00, quantity: 1, manufacturer: 'Ultra Pro', available: true },

    // Card Sorting Tray - SOLD OUT
    { product_name: 'Card Sorting Tray 18 Compartment', category: 'Storage', description: 'Ultra Pro Card Sorting Tray - 18 Compartment.', price_nzd: 18.50, quantity: 0, manufacturer: 'Ultra Pro', available: false },

    // Top Loader Sorting Trays - NEW
    { product_name: 'Top Loader/One Touch Single Sorting Trays (Pack of 6)', category: 'Storage', description: 'One only. NEW!', price_nzd: 16.00, quantity: 1, manufacturer: 'Ultra Pro', available: true },

    // 9-card Screwdown - NEW
    { product_name: '9-Card Screwdown', category: 'Protectors', description: 'One only. NEW!', price_nzd: 35.00, quantity: 1, manufacturer: 'Ultra Pro', available: true },

    // Plastic Boxes
    { product_name: '25 Count Plastic Box - Single', category: 'Boxes', description: '25 count plastic storage box.', price_nzd: 3.00, quantity: 30, manufacturer: 'Ultra Pro', available: true },
    { product_name: '25 Count Plastic Box - Joined Pair', category: 'Boxes', description: '25 count plastic storage boxes - joined pair.', price_nzd: 5.70, quantity: 20, manufacturer: 'Ultra Pro', available: true },
    { product_name: '50 Count Plastic Box (C81173) - Single', category: 'Boxes', description: '50 count plastic storage box.', price_nzd: 3.50, quantity: 30, manufacturer: 'Ultra Pro', available: true },
    { product_name: '50 Count Plastic Box (C81173) - Joined Pair', category: 'Boxes', description: '50 count plastic storage boxes - joined pair.', price_nzd: 6.70, quantity: 20, manufacturer: 'Ultra Pro', available: true },
    { product_name: '100 Count Plastic Box (C81156)', category: 'Boxes', description: '100 count plastic storage box.', price_nzd: 6.30, quantity: 20, manufacturer: 'Ultra Pro', available: true },
    { product_name: '150 Count Plastic Box', category: 'Boxes', description: '150 count plastic storage box.', price_nzd: 5.75, quantity: 20, manufacturer: 'Ultra Pro', available: true },
    { product_name: '200 Count Plastic Box (C81149)', category: 'Boxes', description: '200 count plastic storage box.', price_nzd: 6.00, quantity: 20, manufacturer: 'Ultra Pro', available: true },
    { product_name: '250 Count Plastic Box (C81148)', category: 'Boxes', description: '250 count plastic storage box.', price_nzd: 7.50, quantity: 20, manufacturer: 'Ultra Pro', available: true },
];

async function importProducts() {
    let inserted = 0;
    let skipped = 0;

    for (const p of products) {
        // Check if product already exists
        const existing = await pool.query(
            'SELECT id FROM accessories WHERE product_name = $1',
            [p.product_name]
        );

        if (existing.rows.length > 0) {
            console.log('SKIP (exists):', p.product_name);
            skipped++;
            continue;
        }

        await pool.query(
            `INSERT INTO accessories (product_name, category, description, price_nzd, society_price, quantity, manufacturer, available)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)`,
            [p.product_name, p.category, p.description, p.price_nzd, p.quantity, p.manufacturer, p.available]
        );
        console.log('OK:', p.product_name, '- $' + p.price_nzd);
        inserted++;
    }

    console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
    await pool.end();
}

importProducts().catch(err => {
    console.error('Import failed:', err);
    pool.end();
    process.exit(1);
});
