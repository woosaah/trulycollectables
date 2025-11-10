const pool = require('../config/database');

const Cart = {
    // Add item to cart
    async addItem(userId, itemData) {
        const { card_id, figurine_id, quantity } = itemData;

        // Check if item already exists in cart
        let existingQuery;
        let existingParams;

        if (card_id) {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND card_id = $2';
            existingParams = [userId, card_id];
        } else {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND figurine_id = $2';
            existingParams = [userId, figurine_id];
        }

        const existing = await pool.query(existingQuery, existingParams);

        if (existing.rows.length > 0) {
            // Update quantity
            const updateQuery = `
                UPDATE cart
                SET quantity = quantity + $1
                WHERE id = $2
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [quantity, existing.rows[0].id]);
            return result.rows[0];
        } else {
            // Insert new item
            const query = `
                INSERT INTO cart (user_id, card_id, figurine_id, quantity)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(query, [userId, card_id, figurine_id, quantity]);
            return result.rows[0];
        }
    },

    // Get user's cart with product details
    async getByUser(userId) {
        const query = `
            SELECT
                cart.id,
                cart.quantity,
                cart.card_id,
                cart.figurine_id,
                cards.card_name,
                cards.set_name,
                cards.price_nzd as card_price,
                cards.image_front,
                cards.quantity as card_stock,
                figurines.product_name,
                figurines.price_nzd as figurine_price,
                figurines.image_url,
                figurines.quantity as figurine_stock
            FROM cart
            LEFT JOIN cards ON cart.card_id = cards.id
            LEFT JOIN figurines ON cart.figurine_id = figurines.id
            WHERE cart.user_id = $1
            ORDER BY cart.added_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Update cart item quantity
    async updateQuantity(cartId, userId, quantity) {
        const query = `
            UPDATE cart
            SET quantity = $1
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [quantity, cartId, userId]);
        return result.rows[0];
    },

    // Remove item from cart
    async removeItem(cartId, userId) {
        const query = 'DELETE FROM cart WHERE id = $1 AND user_id = $2';
        await pool.query(query, [cartId, userId]);
    },

    // Clear user's cart
    async clearCart(userId) {
        const query = 'DELETE FROM cart WHERE user_id = $1';
        await pool.query(query, [userId]);
    },

    // Get cart total
    async getTotal(userId) {
        const query = `
            SELECT
                COALESCE(SUM(
                    CASE
                        WHEN cart.card_id IS NOT NULL THEN cart.quantity * cards.price_nzd
                        WHEN cart.figurine_id IS NOT NULL THEN cart.quantity * figurines.price_nzd
                    END
                ), 0) as total
            FROM cart
            LEFT JOIN cards ON cart.card_id = cards.id
            LEFT JOIN figurines ON cart.figurine_id = figurines.id
            WHERE cart.user_id = $1
        `;

        const result = await pool.query(query, [userId]);
        return parseFloat(result.rows[0].total);
    }
};

module.exports = Cart;
