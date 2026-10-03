const pool = require('../config/database');

const Cart = {
    // Add item to cart
    async addItem(userId, itemData) {
        const { card_id, figurine_id, accessory_id, variant_label, variation_id, unit_price, quantity } = itemData;

        // Check if item already exists in cart (same product + same variant)
        let existingQuery;
        let existingParams;

        if (card_id && variation_id) {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND card_id = $2 AND variation_id = $3';
            existingParams = [userId, card_id, variation_id];
        } else if (card_id) {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND card_id = $2 AND variation_id IS NULL';
            existingParams = [userId, card_id];
        } else if (figurine_id) {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND figurine_id = $2';
            existingParams = [userId, figurine_id];
        } else if (variant_label) {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND accessory_id = $2 AND variant_label = $3';
            existingParams = [userId, accessory_id, variant_label];
        } else {
            existingQuery = 'SELECT * FROM cart WHERE user_id = $1 AND accessory_id = $2 AND variant_label IS NULL';
            existingParams = [userId, accessory_id];
        }

        const existing = await pool.query(existingQuery, existingParams);

        // Reject if the total requested quantity would exceed available stock
        if (card_id) {
            const stockResult = await pool.query('SELECT quantity FROM cards WHERE id = $1', [card_id]);
            const stock = stockResult.rows[0]?.quantity ?? 0;
            const alreadyInCart = existing.rows[0]?.quantity || 0;
            if (alreadyInCart + quantity > stock) {
                throw new Error('Insufficient stock');
            }
        } else if (figurine_id) {
            const stockResult = await pool.query('SELECT quantity FROM figurines WHERE id = $1', [figurine_id]);
            const stock = stockResult.rows[0]?.quantity ?? 0;
            const alreadyInCart = existing.rows[0]?.quantity || 0;
            if (alreadyInCart + quantity > stock) {
                throw new Error('Insufficient stock');
            }
        }

        if (existing.rows.length > 0) {
            const updateQuery = `
                UPDATE cart
                SET quantity = quantity + $1
                WHERE id = $2
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [quantity, existing.rows[0].id]);
            return result.rows[0];
        } else {
            const query = `
                INSERT INTO cart (user_id, card_id, figurine_id, accessory_id, variant_label, variation_id, unit_price, quantity)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            const result = await pool.query(query, [userId, card_id, figurine_id, accessory_id, variant_label || null, variation_id || null, unit_price || null, quantity]);
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
                cart.accessory_id,
                cart.variant_label,
                cart.variation_id,
                cart.unit_price,
                cards.card_name,
                cards.set_name,
                cards.price_nzd as card_price,
                cards.image_front,
                cards.quantity as card_stock,
                cards.product_type as card_product_type,
                card_variations.variation_name,
                card_variations.price_nzd as variation_price,
                card_variations.image_url as variation_image,
                figurines.product_name as figurine_name,
                figurines.price_nzd as figurine_price,
                figurines.image_url as figurine_image,
                figurines.quantity as figurine_stock,
                accessories.product_name as accessory_name,
                accessories.price_nzd as accessory_price,
                accessories.society_price as accessory_society_price,
                accessories.image_url as accessory_image,
                accessories.quantity as accessory_stock,
                accessories.category as accessory_category,
                accessories.variants as accessory_variants
            FROM cart
            LEFT JOIN cards ON cart.card_id = cards.id
            LEFT JOIN card_variations ON cart.variation_id = card_variations.id
            LEFT JOIN figurines ON cart.figurine_id = figurines.id
            LEFT JOIN accessories ON cart.accessory_id = accessories.id
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

    // Get cart total - uses unit_price for variant items, society price for members
    async getTotal(userId, isSocietyMember = false) {
        const query = `
            SELECT
                COALESCE(SUM(
                    CASE
                        WHEN cart.card_id IS NOT NULL THEN cart.quantity * COALESCE(card_variations.price_nzd, cards.price_nzd)
                        WHEN cart.figurine_id IS NOT NULL THEN cart.quantity * figurines.price_nzd
                        WHEN cart.accessory_id IS NOT NULL THEN cart.quantity * cart.unit_price
                    END
                ), 0) as total
            FROM cart
            LEFT JOIN cards ON cart.card_id = cards.id
            LEFT JOIN card_variations ON cart.variation_id = card_variations.id
            LEFT JOIN figurines ON cart.figurine_id = figurines.id
            LEFT JOIN accessories ON cart.accessory_id = accessories.id
            WHERE cart.user_id = $1
        `;

        const result = await pool.query(query, [userId]);
        return parseFloat(result.rows[0].total);
    }
};

module.exports = Cart;
