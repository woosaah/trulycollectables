const pool = require('../config/database');

const Inquiry = {
    // Create inquiry
    async create(userId, cardId, message) {
        const query = `
            INSERT INTO inquiries (user_id, card_id, message)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [userId, cardId, message]);
        return result.rows[0];
    },

    // Get all inquiries (admin)
    async findAll(status = null) {
        let query = `
            SELECT
                inquiries.*,
                users.username,
                users.email,
                cards.card_name,
                cards.set_name
            FROM inquiries
            LEFT JOIN users ON inquiries.user_id = users.id
            LEFT JOIN cards ON inquiries.card_id = cards.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND inquiries.status = $1';
            params.push(status);
        }

        query += ' ORDER BY inquiries.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get inquiry by ID
    async findById(id) {
        const query = `
            SELECT
                inquiries.*,
                users.username,
                users.email,
                cards.card_name,
                cards.set_name,
                cards.image_front
            FROM inquiries
            LEFT JOIN users ON inquiries.user_id = users.id
            LEFT JOIN cards ON inquiries.card_id = cards.id
            WHERE inquiries.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Update inquiry status
    async updateStatus(id, status) {
        const query = `
            UPDATE inquiries
            SET status = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    },

    // Get user inquiries
    async findByUser(userId) {
        const query = `
            SELECT
                inquiries.*,
                cards.card_name,
                cards.set_name,
                cards.image_front
            FROM inquiries
            LEFT JOIN cards ON inquiries.card_id = cards.id
            WHERE inquiries.user_id = $1
            ORDER BY inquiries.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
};

module.exports = Inquiry;
