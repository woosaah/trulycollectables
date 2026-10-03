const pool = require('./config/database');

// Define the consolidated products with their variants
const consolidated = [
    // === PAGES ===
    {
        product_name: 'Standard 9 Pocket Pages (C209D)',
        category: 'Pages',
        description: 'Standard sized cards, 64mm x 89mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.85, society_price: 0.70 },
            { label: 'Pack of 10', price: 8.00, society_price: 6.60 },
            { label: 'Box of 100', price: 75.00, society_price: 61.50 }
        ]
    },
    {
        product_name: 'Single Pocket Pages Full (C211D)',
        category: 'Pages',
        description: 'Magazines, 216mm x 280mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: false,
        variants: [
            { label: 'Single', price: 1.10, society_price: 1.00 },
            { label: 'Pack of 10', price: 10.50, society_price: 9.50 },
            { label: 'Box of 100', price: 100.00, society_price: 90.00 }
        ]
    },
    {
        product_name: 'Single Pocket Pages (C201D)',
        category: 'Pages',
        description: '8x10" photos, Master Vision Cards, etc. 203mm x 254mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: false,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.70 },
            { label: 'Pack of 10', price: 8.50, society_price: 6.60 }
        ]
    },
    {
        product_name: 'Ultra Clear Comic Storage Sleeve (UPR81697)',
        category: 'Sleeves',
        description: 'Comics - 3 ring binder compatible, resealable flap closure. 184.15mm x 266.7mm.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '2 Pocket Pages (C202D)',
        category: 'Pages',
        description: 'Postcard sized cards, 127mm x 179mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: false,
        variants: [
            { label: 'Single', price: 1.10, society_price: 1.00 },
            { label: 'Pack of 10', price: 10.50, society_price: 9.50 },
            { label: 'Box of 100', price: 100.00, society_price: 90.00 }
        ]
    },
    {
        product_name: '3 Pocket Pages (C246D)',
        category: 'Pages',
        description: 'Postcard or photograph sized cards (6x4"), 102mm x 153mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '3 Pocket Pages Banknotes (C203D)',
        category: 'Pages',
        description: 'Suitable for Banknotes, 94mm x 207mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: false,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '4 Pocket Pages (C204D)',
        category: 'Pages',
        description: 'Small Postcard sized cards, 89mm x 127mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '6 Pocket Pages (C206D)',
        category: 'Pages',
        description: 'Long cards eg Wide Vision, 64mm x 134mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '8 Pocket Pages (C208D)',
        category: 'Pages',
        description: 'Holds 8 cards, 69mm x 98mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 1.20, society_price: 0.85 },
            { label: 'Pack of 10', price: 11.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 73.00 }
        ]
    },
    {
        product_name: '12 Pocket Pages (C212D)',
        category: 'Pages',
        description: 'Stickers, 51mm x 57mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.85, society_price: 1.00 },
            { label: 'Pack of 10', price: 8.00, society_price: 9.50 },
            { label: 'Box of 100', price: 75.00, society_price: 90.00 }
        ]
    },
    {
        product_name: '15 Pocket Pages (C215D)',
        category: 'Pages',
        description: 'Cigarette Cards and Yowie Papers, 38mm x 90mm. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.90, society_price: 0.85 },
            { label: 'Pack of 10', price: 8.50, society_price: 8.00 },
            { label: 'Box of 100', price: 80.00, society_price: 70.00 }
        ]
    },
    {
        product_name: '20 Pocket Pog Pages',
        category: 'Pages',
        description: 'Medallions and Caps/Tazos. Archival safe, fits any standard 3 ring binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        // Single variant only - use base price fields
        variants: null,
        price_nzd: 1.20,
        society_price: 1.00
    },

    // === SLEEVES ===
    {
        product_name: 'Single Sleeves 100 Pack (RPSCG-1)',
        category: 'Sleeves',
        description: 'Standard size cards only - top loading. Pack of 100.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 6.30,
        society_price: 5.50
    },

    // === BINDERS ===
    {
        product_name: '50mm 3 Ring Binder Collector\'s Album',
        category: 'Binders',
        description: 'Navy or Black - Padded Vinyl. 50mm 3 \'D\' Ring Binder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 25.00,
        society_price: 24.00
    },

    // === PROTECTORS ===
    {
        product_name: 'Mini Snaptites (81136)',
        category: 'Protectors',
        description: 'Mini Snaptite card holder.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 1.80, society_price: 1.80 },
            { label: 'Sealed Pack of 5', price: 4.80, society_price: 4.75 }
        ]
    },
    {
        product_name: 'Regular Clear Top Loaders 25ct Box (C81222)',
        category: 'Protectors',
        description: 'Ultra Pro Regular Clear Top Loaders - 25 count box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 8.85,
        society_price: 8.20
    },
    {
        product_name: 'Top Loader 55pt',
        category: 'Protectors',
        description: 'Ultra Pro Top Loader 55pt thickness.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 12.50,
        society_price: 12.00
    },
    {
        product_name: 'Top Loader 75pt',
        category: 'Protectors',
        description: 'Ultra Pro Top Loader 75pt thickness.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 12.25,
        society_price: 11.50
    },
    {
        product_name: 'Clear Screwdown 1/4" Recessed (C81140)',
        category: 'Protectors',
        description: 'Ultra Pro Clear Screwdowns 1/4" - recessed.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 3.30,
        society_price: 3.00
    },
    {
        product_name: '9-Card Screwdown',
        category: 'Protectors',
        description: 'Ultra Pro 9-card Screwdown.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 35.00,
        society_price: 33.00
    },

    // === SLEEVES (more) ===
    {
        product_name: 'Team Bags 100ct',
        category: 'Sleeves',
        description: 'Ultra Pro Team Bags - 100 count.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 9.50,
        society_price: 9.00
    },
    {
        product_name: 'Deck Protectors 50ct',
        category: 'Sleeves',
        description: 'Ultra Pro Deck Protectors - 50 count.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 9.50,
        society_price: 8.50
    },
    {
        product_name: 'Semi Rigid 1/2" Lip Tall Sleeves',
        category: 'Sleeves',
        description: '80.9mm x 107.9mm.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 0.50, society_price: 0.40 },
            { label: '200ct Box', price: 50.00, society_price: 41.00 }
        ]
    },

    // === DISPLAY ===
    {
        product_name: 'Small Lucite Stand Card Holder 5 Pack',
        category: 'Display Cases',
        description: 'Ultra Pro Small Lucite Stand Card Holder - pack of 5.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 6.30,
        society_price: 5.50
    },

    // === STORAGE ===
    {
        product_name: 'Card Sorting Tray 18 Compartment',
        category: 'Storage',
        description: 'Ultra Pro Card Sorting Tray - 18 Compartment.',
        manufacturer: 'Ultra Pro',
        available: false,
        variants: null,
        price_nzd: 18.50,
        society_price: 17.00
    },
    {
        product_name: 'Top Loader/One Touch Single Sorting Trays (Pack of 6)',
        category: 'Storage',
        description: 'Ultra Pro Top Loader/One Touch Single Sorting Trays.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 16.00,
        society_price: 15.00
    },

    // === BOXES ===
    {
        product_name: '25 Count Plastic Box',
        category: 'Boxes',
        description: '25 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 3.00, society_price: 2.85 },
            { label: 'Joined Pair', price: 5.70, society_price: 5.70 }
        ]
    },
    {
        product_name: '50 Count Plastic Box (C81173)',
        category: 'Boxes',
        description: '50 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: [
            { label: 'Single', price: 3.50, society_price: 3.35 },
            { label: 'Joined Pair', price: 6.70, society_price: 6.70 }
        ]
    },
    {
        product_name: '100 Count Plastic Box (C81156)',
        category: 'Boxes',
        description: '100 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 6.30,
        society_price: 5.50
    },
    {
        product_name: '150 Count Plastic Box',
        category: 'Boxes',
        description: '150 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 5.75,
        society_price: 5.20
    },
    {
        product_name: '200 Count Plastic Box (C81149)',
        category: 'Boxes',
        description: '200 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 6.00,
        society_price: 5.85
    },
    {
        product_name: '250 Count Plastic Box (C81148)',
        category: 'Boxes',
        description: '250 count plastic storage box.',
        manufacturer: 'Ultra Pro',
        available: true,
        variants: null,
        price_nzd: 7.50,
        society_price: 7.00
    },
];

async function run() {
    // Delete all old Ultra Pro accessories
    const delResult = await pool.query("DELETE FROM accessories WHERE manufacturer = 'Ultra Pro'");
    console.log(`Deleted ${delResult.rowCount} old entries\n`);

    let count = 0;
    for (const p of consolidated) {
        // For products with variants, use first variant price as the base price
        const basePrice = p.price_nzd || (p.variants ? p.variants[0].price : null);
        const baseSociety = p.society_price || (p.variants ? p.variants[0].society_price : null);

        const result = await pool.query(
            `INSERT INTO accessories (product_name, category, description, price_nzd, society_price, quantity, manufacturer, available, variants)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
             RETURNING id, product_name`,
            [p.product_name, p.category, p.description, basePrice, baseSociety, p.manufacturer, p.available, p.variants ? JSON.stringify(p.variants) : null]
        );
        const hasVariants = p.variants ? ` (${p.variants.length} variants)` : '';
        console.log(`OK: ${result.rows[0].product_name}${hasVariants}`);
        count++;
    }

    console.log(`\nDone: ${count} consolidated products created`);
    await pool.end();
}

run().catch(err => {
    console.error('Failed:', err);
    pool.end();
    process.exit(1);
});
