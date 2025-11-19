const pool = require('../config/database');

const Wishlist = {
    // Add item to wishlist
    async add(userId, cardId = null, figurineId = null) {
        const query = `
            INSERT INTO wishlist (user_id, card_id, figurine_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, card_id, figurine_id) DO NOTHING
            RETURNING *
        `;

        const result = await pool.query(query, [userId, cardId, figurineId]);
        return result.rows[0];
    },

    // Get user's wishlist
    async findByUser(userId) {
        const query = `
            SELECT
                wishlist.*,
                cards.card_name,
                cards.set_name,
                cards.price_nzd as card_price,
                cards.image_front,
                cards.available as card_available,
                cards.quantity as card_quantity,
                figurines.product_name,
                figurines.price_nzd as figurine_price,
                figurines.image_url,
                figurines.available as figurine_available,
                figurines.quantity as figurine_quantity
            FROM wishlist
            LEFT JOIN cards ON wishlist.card_id = cards.id
            LEFT JOIN figurines ON wishlist.figurine_id = figurines.id
            WHERE wishlist.user_id = $1
            ORDER BY wishlist.added_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Check if item is in wishlist
    async isInWishlist(userId, cardId = null, figurineId = null) {
        let query = 'SELECT EXISTS (SELECT 1 FROM wishlist WHERE user_id = $1';
        const params = [userId];

        if (cardId) {
            query += ' AND card_id = $2';
            params.push(cardId);
        } else if (figurineId) {
            query += ' AND figurine_id = $2';
            params.push(figurineId);
        }

        query += ') AS in_wishlist';

        const result = await pool.query(query, params);
        return result.rows[0].in_wishlist;
    },

    // Remove from wishlist
    async remove(userId, cardId = null, figurineId = null) {
        let query = 'DELETE FROM wishlist WHERE user_id = $1';
        const params = [userId];

        if (cardId) {
            query += ' AND card_id = $2';
            params.push(cardId);
        } else if (figurineId) {
            query += ' AND figurine_id = $2';
            params.push(figurineId);
        }

        await pool.query(query, params);
    },

    // Get wishlist count
    async getCount(userId) {
        const query = 'SELECT COUNT(*) FROM wishlist WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }
};

module.exports = Wishlist;
