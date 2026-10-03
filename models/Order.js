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

            const { customer_name, customer_email, shipping_address, notes, coupon_id, discount_amount, shipping_method, shipping_cost, payment_method } = orderData;

            // Get cart items
            // Check if user is a society member for pricing
            const userResult = await client.query('SELECT is_society_member FROM users WHERE id = $1', [userId]);
            const isSocietyMember = userResult.rows[0]?.is_society_member || false;

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

            // Calculate total - use unit_price for accessories (already resolved at add-to-cart time)
            let total = 0;
            for (const item of cartResult.rows) {
                let price;
                if (item.card_price) {
                    price = item.card_price;
                } else if (item.figurine_price) {
                    price = item.figurine_price;
                } else {
                    price = item.unit_price;
                }
                total += item.quantity * price;
            }

            // Create order
            const orderNumber = this.generateOrderNumber();
            const subtotal = total;
            const finalDiscount = discount_amount || 0;
            const finalShipping = parseFloat(shipping_cost) || 0;
            const finalTotal = total - finalDiscount + finalShipping;

            const orderQuery = `
                INSERT INTO orders (
                    user_id, order_number, subtotal_nzd, discount_amount, shipping_cost, shipping_method, total_nzd,
                    customer_name, customer_email, shipping_address, notes, coupon_id, payment_method
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const orderResult = await client.query(orderQuery, [
                userId, orderNumber, subtotal, finalDiscount, finalShipping, shipping_method || null, finalTotal,
                customer_name, customer_email, shipping_address, notes, coupon_id || null,
                payment_method || 'bank_transfer'
            ]);

            const order = orderResult.rows[0];

            // Create order items
            for (const item of cartResult.rows) {
                let price;
                if (item.card_price) {
                    price = item.card_price;
                } else if (item.figurine_price) {
                    price = item.figurine_price;
                } else {
                    price = item.unit_price;
                }

                const itemQuery = `
                    INSERT INTO order_items (
                        order_id, card_id, figurine_id, accessory_id, variant_label, quantity, price_nzd
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                await client.query(itemQuery, [
                    order.id, item.card_id, item.figurine_id, item.accessory_id, item.variant_label || null, item.quantity, price
                ]);

                // Update inventory - reject the whole order if stock is insufficient
                if (item.card_id) {
                    const stockUpdate = await client.query(
                        'UPDATE cards SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING quantity',
                        [item.quantity, item.card_id]
                    );
                    if (stockUpdate.rowCount === 0) {
                        throw new Error(`Insufficient stock for card ${item.card_id}`);
                    }
                } else if (item.figurine_id) {
                    const stockUpdate = await client.query(
                        'UPDATE figurines SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING quantity',
                        [item.quantity, item.figurine_id]
                    );
                    if (stockUpdate.rowCount === 0) {
                        throw new Error(`Insufficient stock for figurine ${item.figurine_id}`);
                    }
                } else if (item.accessory_id) {
                    // For variant items, deduct units_per * quantity from stock
                    if (item.variant_label) {
                        const accResult = await client.query('SELECT variants FROM accessories WHERE id = $1', [item.accessory_id]);
                        if (accResult.rows[0] && accResult.rows[0].variants) {
                            let variants = typeof accResult.rows[0].variants === 'string'
                                ? JSON.parse(accResult.rows[0].variants) : accResult.rows[0].variants;
                            const variant = variants.find(v => v.label === item.variant_label);
                            const unitsPer = variant ? (variant.units_per || 1) : 1;
                            const unitsToDeduct = item.quantity * unitsPer;
                            const stockUpdate = await client.query(
                                'UPDATE accessories SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING quantity',
                                [unitsToDeduct, item.accessory_id]
                            );
                            if (stockUpdate.rowCount === 0) {
                                throw new Error(`Insufficient stock for accessory ${item.accessory_id}`);
                            }
                        }
                    } else {
                        const stockUpdate = await client.query(
                            'UPDATE accessories SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING quantity',
                            [item.quantity, item.accessory_id]
                        );
                        if (stockUpdate.rowCount === 0) {
                            throw new Error(`Insufficient stock for accessory ${item.accessory_id}`);
                        }
                    }
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
                figurines.product_name as figurine_name,
                figurines.image_url as figurine_image,
                accessories.product_name as accessory_name,
                accessories.image_url as accessory_image,
                accessories.category as accessory_category
            FROM order_items
            LEFT JOIN cards ON order_items.card_id = cards.id
            LEFT JOIN figurines ON order_items.figurine_id = figurines.id
            LEFT JOIN accessories ON order_items.accessory_id = accessories.id
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
