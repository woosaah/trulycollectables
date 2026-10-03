const pool = require('../config/database');

const Set = {
    // Find all sets with optional filters
    async findAll(filters = {}, limit = 50, offset = 0) {
        let query = `SELECT * FROM sets WHERE 1=1`;
        const params = [];
        let paramCount = 0;

        if (filters.sport_type) {
            paramCount++;
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
        }

        if (filters.manufacturer) {
            paramCount++;
            query += ` AND manufacturer = $${paramCount}`;
            params.push(filters.manufacturer);
        }

        if (filters.card_category) {
            paramCount++;
            query += ` AND card_category = $${paramCount}`;
            params.push(filters.card_category);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (set_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        query += ` ORDER BY set_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Count sets with filters
    async count(filters = {}) {
        let query = `SELECT COUNT(*) FROM sets WHERE 1=1`;
        const params = [];
        let paramCount = 0;

        if (filters.sport_type) {
            paramCount++;
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
        }

        if (filters.manufacturer) {
            paramCount++;
            query += ` AND manufacturer = $${paramCount}`;
            params.push(filters.manufacturer);
        }

        if (filters.card_category) {
            paramCount++;
            query += ` AND card_category = $${paramCount}`;
            params.push(filters.card_category);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (set_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    },

    // Find set by ID
    async findById(id) {
        const query = `SELECT * FROM sets WHERE id = $1`;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Find set by name
    async findByName(setName) {
        const query = `SELECT * FROM sets WHERE set_name = $1`;
        const result = await pool.query(query, [setName]);
        return result.rows[0];
    },

    // Create new set
    async create(setData) {
        const query = `
            INSERT INTO sets (set_name, manufacturer, year, sport_type, card_category, card_subtype, description, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await pool.query(query, [
            setData.set_name,
            setData.manufacturer,
            setData.year,
            setData.sport_type,
            setData.card_category,
            setData.card_subtype || null,
            setData.description,
            setData.image_url
        ]);
        return result.rows[0];
    },

    // Update set
    async update(id, setData) {
        const query = `
            UPDATE sets
            SET set_name = $1,
                manufacturer = $2,
                year = $3,
                sport_type = $4,
                card_category = $5,
                card_subtype = $6,
                description = $7,
                image_url = $8
            WHERE id = $9
            RETURNING *
        `;
        const result = await pool.query(query, [
            setData.set_name,
            setData.manufacturer,
            setData.year,
            setData.sport_type,
            setData.card_category,
            setData.card_subtype || null,
            setData.description,
            setData.image_url,
            id
        ]);
        return result.rows[0];
    },

    // Delete set
    async delete(id) {
        const query = `DELETE FROM sets WHERE id = $1`;
        await pool.query(query, [id]);
    },

    // Get all sport types
    async getSportTypes() {
        const query = `SELECT DISTINCT sport_type FROM sets WHERE sport_type IS NOT NULL ORDER BY sport_type`;
        const result = await pool.query(query);
        return result.rows.map(row => row.sport_type);
    },

    // Get all manufacturers
    async getManufacturers() {
        const query = `SELECT DISTINCT manufacturer FROM sets WHERE manufacturer IS NOT NULL ORDER BY manufacturer`;
        const result = await pool.query(query);
        return result.rows.map(row => row.manufacturer);
    },

    // === SET PARALLELS ===

    async getParallels(setId) {
        const result = await pool.query(
            'SELECT * FROM set_parallels WHERE set_id = $1 ORDER BY sort_order, variation_name',
            [setId]
        );
        return result.rows;
    },

    // Add a parallel to a set and create card_variations for all existing matching cards
    async addParallel(setId, data) {
        const { variation_name, default_price, sort_order, applies_to } = data;

        // Insert the parallel definition
        const parallel = await pool.query(
            `INSERT INTO set_parallels (set_id, variation_name, default_price, sort_order, applies_to)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [setId, variation_name, default_price ?? 0, sort_order ?? 0, applies_to || 'base']
        );

        // Find the set name to match cards
        const setRow = await pool.query('SELECT set_name FROM sets WHERE id = $1', [setId]);
        if (!setRow.rows[0]) return parallel.rows[0];
        const setName = setRow.rows[0].set_name;

        // Build card filter — 'base' = numeric card numbers only, 'all' = everything
        let cardQuery = 'SELECT id FROM cards WHERE set_name = $1';
        if (applies_to !== 'all') {
            cardQuery += ` AND card_number ~ '^[0-9]+$'`;
        }
        const cards = await pool.query(cardQuery, [setName]);

        // Bulk-create card_variations for all matching cards
        for (const card of cards.rows) {
            await pool.query(
                `INSERT INTO card_variations (card_id, variation_name, price_nzd, quantity, sort_order)
                 VALUES ($1, $2, $3, 0, $4)
                 ON CONFLICT (card_id, variation_name) DO NOTHING`,
                [card.id, variation_name, default_price ?? 0, sort_order ?? 0]
            );
        }

        return { ...parallel.rows[0], cards_updated: cards.rows.length };
    },

    async deleteParallel(parallelId) {
        await pool.query('DELETE FROM set_parallels WHERE id = $1', [parallelId]);
    },

    // Called when a new card is created — creates any defined parallels for its set
    async applyParallelsToCard(cardId, setName) {
        const setRow = await pool.query('SELECT id FROM sets WHERE set_name = $1', [setName]);
        if (!setRow.rows[0]) return;
        const setId = setRow.rows[0].id;

        const parallels = await pool.query('SELECT * FROM set_parallels WHERE set_id = $1', [setId]);
        for (const p of parallels.rows) {
            // Check if card number is numeric (for 'base' parallels)
            const card = await pool.query('SELECT card_number FROM cards WHERE id = $1', [cardId]);
            if (!card.rows[0]) continue;
            const isNumeric = /^\d+$/.test(card.rows[0].card_number);
            if (p.applies_to !== 'all' && !isNumeric) continue;

            await pool.query(
                `INSERT INTO card_variations (card_id, variation_name, price_nzd, quantity, sort_order)
                 VALUES ($1, $2, $3, 0, $4)
                 ON CONFLICT (card_id, variation_name) DO NOTHING`,
                [cardId, p.variation_name, p.default_price, p.sort_order]
            );
        }
    }
};

module.exports = Set;
