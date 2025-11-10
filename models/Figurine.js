const pool = require('../config/database');

const Figurine = {
    // Create a new figurine
    async create(figurineData) {
        const {
            product_name, description, price_aud, price_nzd,
            quantity, image_url, supplier
        } = figurineData;

        const query = `
            INSERT INTO figurines (
                product_name, description, price_aud, price_nzd,
                quantity, image_url, supplier, approved
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, false)
            RETURNING *
        `;

        const result = await pool.query(query, [
            product_name, description, price_aud, price_nzd,
            quantity, image_url, supplier
        ]);

        return result.rows[0];
    },

    // Get all figurines
    async findAll(approved = true, limit = 20, offset = 0) {
        const query = `
            SELECT * FROM figurines
            WHERE approved = $1 AND available = true
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [approved, limit, offset]);
        return result.rows;
    },

    // Get pending approvals
    async getPending() {
        const query = `
            SELECT * FROM figurines
            WHERE approved = false
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // Get figurine by ID
    async findById(id) {
        const query = 'SELECT * FROM figurines WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Update figurine
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
            UPDATE figurines
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Approve figurine
    async approve(id) {
        const query = `
            UPDATE figurines
            SET approved = true
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Delete figurine
    async delete(id) {
        const query = 'DELETE FROM figurines WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Count figurines
    async count(approved = true) {
        const query = 'SELECT COUNT(*) FROM figurines WHERE approved = $1 AND available = true';
        const result = await pool.query(query, [approved]);
        return parseInt(result.rows[0].count);
    }
};

module.exports = Figurine;
