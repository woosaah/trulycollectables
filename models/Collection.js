const pool = require('../config/database');

const Collection = {
    // Add card to user collection
    async add(userId, cardData) {
        const {
            card_name, set_name, card_number, year, sport_type,
            quantity, status, notes
        } = cardData;

        const query = `
            INSERT INTO user_collections (
                user_id, card_name, set_name, card_number, year, sport_type,
                quantity, status, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await pool.query(query, [
            userId, card_name, set_name, card_number, year, sport_type,
            quantity, status, notes
        ]);

        return result.rows[0];
    },

    // Get user's collection
    async findByUser(userId, status = null) {
        let query = 'SELECT * FROM user_collections WHERE user_id = $1';
        const params = [userId];

        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get collection item by ID
    async findById(id, userId) {
        const query = 'SELECT * FROM user_collections WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    },

    // Update collection item
    async update(id, userId, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'user_id') {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(id, userId);
        const query = `
            UPDATE user_collections
            SET ${fields.join(', ')}
            WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Delete collection item
    async delete(id, userId) {
        const query = 'DELETE FROM user_collections WHERE id = $1 AND user_id = $2';
        await pool.query(query, [id, userId]);
    },

    // Export user's collection as CSV data
    async exportToCSV(userId, status = null) {
        let query = 'SELECT * FROM user_collections WHERE user_id = $1';
        const params = [userId];

        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }

        query += ' ORDER BY card_name, set_name';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Find matches with seller inventory
    async findMatches(userId) {
        const query = `
            SELECT
                uc.id as collection_id,
                uc.card_name,
                uc.set_name,
                uc.card_number,
                c.id as card_id,
                c.price_nzd,
                c.condition,
                c.quantity as available_quantity,
                c.image_front
            FROM user_collections uc
            INNER JOIN cards c ON
                LOWER(uc.card_name) = LOWER(c.card_name)
                AND (uc.set_name IS NULL OR LOWER(uc.set_name) = LOWER(c.set_name))
                AND (uc.card_number IS NULL OR uc.card_number = c.card_number)
            WHERE uc.user_id = $1
                AND uc.status = 'want'
                AND c.available = true
            ORDER BY uc.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    }
};

module.exports = Collection;
