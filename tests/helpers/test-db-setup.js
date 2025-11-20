const pool = require('../../config/database');

// Test data cleanup functions
const cleanupTestData = async () => {
    try {
        // Clean up in reverse order of dependencies
        await pool.query('DELETE FROM order_items WHERE 1=1');
        await pool.query('DELETE FROM orders WHERE 1=1');
        await pool.query('DELETE FROM cart_items WHERE 1=1');
        await pool.query('DELETE FROM cart WHERE 1=1');
        await pool.query('DELETE FROM collection WHERE 1=1');
        await pool.query('DELETE FROM reviews WHERE 1=1');
        await pool.query('DELETE FROM wishlist WHERE 1=1');
        await pool.query('DELETE FROM stock_notifications WHERE 1=1');
        await pool.query('DELETE FROM trademe_listings WHERE 1=1');
        await pool.query('DELETE FROM trademe_questions WHERE 1=1');
        await pool.query('DELETE FROM activity_logs WHERE 1=1');
        await pool.query("DELETE FROM users WHERE email LIKE '%test%'");
        await pool.query("DELETE FROM cards WHERE card_name LIKE '%TEST%'");
        await pool.query("DELETE FROM figurines WHERE product_name LIKE '%TEST%'");
        await pool.query("DELETE FROM coupons WHERE code LIKE '%TEST%'");
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

// Create test user
const createTestUser = async (overrides = {}) => {
    const defaultUser = {
        username: 'testuser' + Date.now(),
        email: 'test' + Date.now() + '@test.com',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
    };

    const userData = { ...defaultUser, ...overrides };

    const query = `
        INSERT INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await pool.query(query, [
        userData.username,
        userData.email,
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.role
    ]);

    return result.rows[0];
};

// Create test card
const createTestCard = async (overrides = {}) => {
    const defaultCard = {
        card_name: 'TEST Card ' + Date.now(),
        set_name: 'TEST Set',
        sport: 'basketball',
        card_number: 'TEST-' + Date.now(),
        year: 2023,
        condition: 'near mint',
        price_nzd: 10.00,
        quantity: 5,
        graded: false
    };

    const cardData = { ...defaultCard, ...overrides };

    const query = `
        INSERT INTO cards (
            card_name, set_name, sport, card_number, year, condition,
            price_nzd, quantity, graded
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;

    const result = await pool.query(query, [
        cardData.card_name,
        cardData.set_name,
        cardData.sport,
        cardData.card_number,
        cardData.year,
        cardData.condition,
        cardData.price_nzd,
        cardData.quantity,
        cardData.graded
    ]);

    return result.rows[0];
};

// Create test figurine
const createTestFigurine = async (overrides = {}) => {
    const defaultFigurine = {
        product_name: 'TEST Figurine ' + Date.now(),
        category: 'basketball',
        price_nzd: 25.00,
        quantity: 3,
        description: 'Test figurine description',
        status: 'approved'
    };

    const figurineData = { ...defaultFigurine, ...overrides };

    const query = `
        INSERT INTO figurines (
            product_name, category, price_nzd, quantity, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await pool.query(query, [
        figurineData.product_name,
        figurineData.category,
        figurineData.price_nzd,
        figurineData.quantity,
        figurineData.description,
        figurineData.status
    ]);

    return result.rows[0];
};

// Create test order
const createTestOrder = async (userId, overrides = {}) => {
    const defaultOrder = {
        user_id: userId,
        total_nzd: 50.00,
        status: 'pending',
        shipping_address: 'Test Address',
        shipping_city: 'Test City',
        shipping_postcode: '1234'
    };

    const orderData = { ...defaultOrder, ...overrides };

    const query = `
        INSERT INTO orders (
            user_id, total_nzd, status, shipping_address, shipping_city, shipping_postcode
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await pool.query(query, [
        orderData.user_id,
        orderData.total_nzd,
        orderData.status,
        orderData.shipping_address,
        orderData.shipping_city,
        orderData.shipping_postcode
    ]);

    return result.rows[0];
};

module.exports = {
    cleanupTestData,
    createTestUser,
    createTestCard,
    createTestFigurine,
    createTestOrder,
    pool
};
