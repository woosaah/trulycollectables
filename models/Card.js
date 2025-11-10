const pool = require('../config/database');

const Card = {
    // Create a new card
    async create(cardData) {
        const {
            card_name, set_name, card_number, year, sport_type,
            condition, price_nzd, quantity, image_front, image_back, description
        } = cardData;

        const query = `
            INSERT INTO cards (
                card_name, set_name, card_number, year, sport_type,
                condition, price_nzd, quantity, image_front, image_back, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const result = await pool.query(query, [
            card_name, set_name, card_number, year, sport_type,
            condition, price_nzd, quantity, image_front, image_back, description
        ]);

        return result.rows[0];
    },

    // Get all cards with pagination and filters
    async findAll(filters = {}, limit = 20, offset = 0) {
        let query = 'SELECT * FROM cards WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.sport_type) {
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
            paramCount++;
        }

        if (filters.set_name) {
            query += ` AND set_name ILIKE $${paramCount}`;
            params.push(`%${filters.set_name}%`);
            paramCount++;
        }

        if (filters.year) {
            query += ` AND year = $${paramCount}`;
            params.push(filters.year);
            paramCount++;
        }

        if (filters.condition) {
            query += ` AND condition = $${paramCount}`;
            params.push(filters.condition);
            paramCount++;
        }

        if (filters.min_price) {
            query += ` AND price_nzd >= $${paramCount}`;
            params.push(filters.min_price);
            paramCount++;
        }

        if (filters.max_price) {
            query += ` AND price_nzd <= $${paramCount}`;
            params.push(filters.max_price);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (card_name ILIKE $${paramCount} OR set_name ILIKE $${paramCount} OR card_number ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        // Sorting
        const sortBy = filters.sort || 'created_at';
        const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Pagination
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get total count of cards (for pagination)
    async count(filters = {}) {
        let query = 'SELECT COUNT(*) FROM cards WHERE available = true';
        const params = [];
        let paramCount = 1;

        if (filters.sport_type) {
            query += ` AND sport_type = $${paramCount}`;
            params.push(filters.sport_type);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (card_name ILIKE $${paramCount} OR set_name ILIKE $${paramCount} OR card_number ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    },

    // Get card by ID
    async findById(id) {
        const query = 'SELECT * FROM cards WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Update card
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(id);
        const query = `
            UPDATE cards
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Delete card
    async delete(id) {
        const query = 'DELETE FROM cards WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Get unique sport types
    async getSportTypes() {
        const query = 'SELECT DISTINCT sport_type FROM cards WHERE sport_type IS NOT NULL ORDER BY sport_type';
        const result = await pool.query(query);
        return result.rows.map(row => row.sport_type);
    },

    // Get unique sets
    async getSets() {
        const query = 'SELECT DISTINCT set_name FROM cards WHERE set_name IS NOT NULL ORDER BY set_name';
        const result = await pool.query(query);
        return result.rows.map(row => row.set_name);
    },

    // Get featured cards (most recent)
    async getFeatured(limit = 6) {
        const query = `
            SELECT * FROM cards
            WHERE available = true
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    }
};

module.exports = Card;
