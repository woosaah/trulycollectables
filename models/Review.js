const pool = require('../config/database');

const Review = {
    // Create review
    async create(userId, reviewData) {
        const {
            card_id, figurine_id, rating, review_text, verified_purchase
        } = reviewData;

        const query = `
            INSERT INTO reviews (user_id, card_id, figurine_id, rating, review_text, verified_purchase)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            userId, card_id, figurine_id, rating, review_text, verified_purchase || false
        ]);

        return result.rows[0];
    },

    // Get reviews for a card/figurine
    async findByProduct(cardId = null, figurineId = null, approvedOnly = true) {
        let query = `
            SELECT
                reviews.*,
                users.username
            FROM reviews
            LEFT JOIN users ON reviews.user_id = users.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (cardId) {
            query += ` AND reviews.card_id = $${paramCount}`;
            params.push(cardId);
            paramCount++;
        }

        if (figurineId) {
            query += ` AND reviews.figurine_id = $${paramCount}`;
            params.push(figurineId);
            paramCount++;
        }

        if (approvedOnly) {
            query += ' AND reviews.approved = true';
        }

        query += ' ORDER BY reviews.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Get user's reviews
    async findByUser(userId) {
        const query = `
            SELECT
                reviews.*,
                cards.card_name,
                cards.set_name,
                figurines.product_name
            FROM reviews
            LEFT JOIN cards ON reviews.card_id = cards.id
            LEFT JOIN figurines ON reviews.figurine_id = figurines.id
            WHERE reviews.user_id = $1
            ORDER BY reviews.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Check if user has purchased product
    async hasUserPurchased(userId, cardId = null, figurineId = null) {
        let query = `
            SELECT EXISTS (
                SELECT 1 FROM order_items
                JOIN orders ON order_items.order_id = orders.id
                WHERE orders.user_id = $1
                AND orders.status IN ('completed', 'shipped')
        `;
        const params = [userId];

        if (cardId) {
            query += ' AND order_items.card_id = $2';
            params.push(cardId);
        } else if (figurineId) {
            query += ' AND order_items.figurine_id = $2';
            params.push(figurineId);
        }

        query += ') AS purchased';

        const result = await pool.query(query, params);
        return result.rows[0].purchased;
    },

    // Get pending reviews (admin)
    async getPending() {
        const query = `
            SELECT
                reviews.*,
                users.username,
                cards.card_name,
                cards.set_name,
                figurines.product_name
            FROM reviews
            LEFT JOIN users ON reviews.user_id = users.id
            LEFT JOIN cards ON reviews.card_id = cards.id
            LEFT JOIN figurines ON reviews.figurine_id = figurines.id
            WHERE reviews.approved = false
            ORDER BY reviews.created_at DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    // Approve review
    async approve(id) {
        const query = `
            UPDATE reviews
            SET approved = true
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Delete review
    async delete(id) {
        const query = 'DELETE FROM reviews WHERE id = $1';
        await pool.query(query, [id]);
    },

    // Increment helpful count
    async incrementHelpful(id) {
        const query = `
            UPDATE reviews
            SET helpful_count = helpful_count + 1
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
};

module.exports = Review;
