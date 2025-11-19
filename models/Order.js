const pool = require('../config/database');
const emailService = require('../services/emailService');

const Order = {
    // Generate unique order number
    generateOrderNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `ORD-${timestamp}-${random}`;
    },

    // Create order from cart
    async create(userId, orderData) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { customer_name, customer_email, shipping_address, notes, coupon_id, discount_amount } = orderData;

            // Get cart items
            const cartQuery = `
                SELECT
                    cart.*,
                    cards.price_nzd as card_price,
                    figurines.price_nzd as figurine_price
                FROM cart
                LEFT JOIN cards ON cart.card_id = cards.id
                LEFT JOIN figurines ON cart.figurine_id = figurines.id
                WHERE cart.user_id = $1
            `;
            const cartResult = await client.query(cartQuery, [userId]);

            if (cartResult.rows.length === 0) {
                throw new Error('Cart is empty');
            }

            // Calculate total
            let total = 0;
            for (const item of cartResult.rows) {
                const price = item.card_price || item.figurine_price;
                total += item.quantity * price;
            }

            // Create order
            const orderNumber = this.generateOrderNumber();
            const subtotal = total;
            const finalDiscount = discount_amount || 0;
            const finalTotal = total - finalDiscount;

            const orderQuery = `
                INSERT INTO orders (
                    user_id, order_number, subtotal_nzd, discount_amount, total_nzd,
                    customer_name, customer_email, shipping_address, notes, coupon_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const orderResult = await client.query(orderQuery, [
                userId, orderNumber, subtotal, finalDiscount, finalTotal,
                customer_name, customer_email, shipping_address, notes, coupon_id || null
            ]);

            const order = orderResult.rows[0];

            // Create order items
            for (const item of cartResult.rows) {
                const price = item.card_price || item.figurine_price;
                const itemQuery = `
                    INSERT INTO order_items (
                        order_id, card_id, figurine_id, quantity, price_nzd
                    )
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await client.query(itemQuery, [
                    order.id, item.card_id, item.figurine_id, item.quantity, price
                ]);

                // Update inventory
                if (item.card_id) {
                    await client.query(
                        'UPDATE cards SET quantity = quantity - $1 WHERE id = $2',
                        [item.quantity, item.card_id]
                    );
                } else if (item.figurine_id) {
                    await client.query(
                        'UPDATE figurines SET quantity = quantity - $1 WHERE id = $2',
                        [item.quantity, item.figurine_id]
                    );
                }
            }

            // Clear cart
            await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);

            await client.query('COMMIT');

            // Send order confirmation email
            try {
                const orderItems = await this.getItems(order.id);
                await emailService.sendOrderConfirmation(order, orderItems);
            } catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
            }

            return order;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Get order by ID
    async findById(id) {
        const query = `
            SELECT * FROM orders WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Get order by order number
    async findByOrderNumber(orderNumber) {
        const query = `
            SELECT * FROM orders WHERE order_number = $1
        `;
        const result = await pool.query(query, [orderNumber]);
        return result.rows[0];
    },

    // Get order items
    async getItems(orderId) {
        const query = `
            SELECT
                order_items.*,
                cards.card_name,
                cards.set_name,
                cards.image_front,
                figurines.product_name,
                figurines.image_url
            FROM order_items
            LEFT JOIN cards ON order_items.card_id = cards.id
            LEFT JOIN figurines ON order_items.figurine_id = figurines.id
            WHERE order_items.order_id = $1
        `;
        const result = await pool.query(query, [orderId]);
        return result.rows;
    },

    // Get user orders
    async findByUser(userId) {
        const query = `
            SELECT * FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Get all orders (admin)
    async findAll(filters = {}) {
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        if (filters.search) {
            query += ` AND (order_number ILIKE $${paramCount} OR customer_name ILIKE $${paramCount} OR customer_email ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Update order status
    async updateStatus(id, status) {
        const query = `
            UPDATE orders
            SET status = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [status, id]);
        const order = result.rows[0];

        // Send status update email
        try {
            await emailService.sendOrderStatusUpdate(order, status);
        } catch (emailError) {
            console.error('Failed to send order status update email:', emailError);
        }

        return order;
    }
};

module.exports = Order;
