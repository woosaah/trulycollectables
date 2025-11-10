const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Collection = require('../models/Collection');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const { body, validationResult } = require('express-validator');

// All routes require authentication
router.use(requireAuth);

// User dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const recentOrders = await Order.findByUser(req.session.user.id);
        const cartItems = await Cart.getByUser(req.session.user.id);
        const matches = await Collection.findMatches(req.session.user.id);

        res.render('user/dashboard', {
            title: 'My Dashboard',
            recentOrders: recentOrders.slice(0, 5),
            cartCount: cartItems.length,
            matchesCount: matches.length
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load dashboard'
        });
    }
});

// === COLLECTION ROUTES ===

// View collection
router.get('/collection', async (req, res) => {
    try {
        const status = req.query.status || 'have';
        const collection = await Collection.findByUser(req.session.user.id, status);

        res.render('user/collection', {
            title: 'My Collection',
            collection,
            status
        });
    } catch (error) {
        console.error('Collection error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load collection'
        });
    }
});

// Add to collection form
router.get('/collection/add', (req, res) => {
    res.render('user/collection-add', {
        title: 'Add to Collection',
        errors: [],
        formData: {}
    });
});

// Add to collection handler
router.post('/collection/add', [
    body('card_name').trim().notEmpty().withMessage('Card name is required'),
    body('status').isIn(['have', 'want']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('user/collection-add', {
            title: 'Add to Collection',
            errors: errors.array(),
            formData: req.body
        });
    }

    try {
        await Collection.add(req.session.user.id, req.body);
        res.redirect('/user/collection?status=' + req.body.status);
    } catch (error) {
        console.error('Add to collection error:', error);
        res.render('user/collection-add', {
            title: 'Add to Collection',
            errors: [{ msg: 'Unable to add card to collection' }],
            formData: req.body
        });
    }
});

// Edit collection item
router.get('/collection/:id/edit', async (req, res) => {
    try {
        const item = await Collection.findById(req.params.id, req.session.user.id);

        if (!item) {
            return res.status(404).render('public/404', { title: 'Not Found' });
        }

        res.render('user/collection-edit', {
            title: 'Edit Collection Item',
            item,
            errors: []
        });
    } catch (error) {
        console.error('Edit collection error:', error);
        res.redirect('/user/collection');
    }
});

// Update collection item
router.post('/collection/:id/edit', async (req, res) => {
    try {
        await Collection.update(req.params.id, req.session.user.id, req.body);
        res.redirect('/user/collection?status=' + req.body.status);
    } catch (error) {
        console.error('Update collection error:', error);
        res.redirect('/user/collection');
    }
});

// Delete collection item
router.post('/collection/:id/delete', async (req, res) => {
    try {
        await Collection.delete(req.params.id, req.session.user.id);
        res.redirect('back');
    } catch (error) {
        console.error('Delete collection error:', error);
        res.redirect('/user/collection');
    }
});

// Export collection
router.get('/collection/export', async (req, res) => {
    try {
        const status = req.query.status || null;
        const collection = await Collection.exportToCSV(req.session.user.id, status);

        // Generate CSV
        const csv = [
            'Card Name,Set Name,Card Number,Year,Sport Type,Quantity,Status,Notes',
            ...collection.map(item =>
                `"${item.card_name}","${item.set_name || ''}","${item.card_number || ''}",${item.year || ''},"${item.sport_type || ''}",${item.quantity},"${item.status}","${item.notes || ''}"`
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=collection-${status || 'all'}-${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export collection error:', error);
        res.redirect('/user/collection');
    }
});

// Collection matcher
router.get('/collection/matches', async (req, res) => {
    try {
        const matches = await Collection.findMatches(req.session.user.id);

        res.render('user/collection-matches', {
            title: 'Collection Matches',
            matches
        });
    } catch (error) {
        console.error('Collection matches error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load matches'
        });
    }
});

// === CART ROUTES ===

// View cart
router.get('/cart', async (req, res) => {
    try {
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id);

        res.render('user/cart', {
            title: 'Shopping Cart',
            cartItems,
            total
        });
    } catch (error) {
        console.error('Cart error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load cart'
        });
    }
});

// Add to cart
router.post('/cart/add', async (req, res) => {
    try {
        const { card_id, figurine_id, quantity } = req.body;
        await Cart.addItem(req.session.user.id, {
            card_id: card_id || null,
            figurine_id: figurine_id || null,
            quantity: parseInt(quantity) || 1
        });

        res.redirect('/user/cart');
    } catch (error) {
        console.error('Add to cart error:', error);
        res.redirect('back');
    }
});

// Update cart quantity
router.post('/cart/:id/update', async (req, res) => {
    try {
        const quantity = parseInt(req.body.quantity);
        if (quantity > 0) {
            await Cart.updateQuantity(req.params.id, req.session.user.id, quantity);
        }
        res.redirect('/user/cart');
    } catch (error) {
        console.error('Update cart error:', error);
        res.redirect('/user/cart');
    }
});

// Remove from cart
router.post('/cart/:id/remove', async (req, res) => {
    try {
        await Cart.removeItem(req.params.id, req.session.user.id);
        res.redirect('/user/cart');
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.redirect('/user/cart');
    }
});

// === CHECKOUT ROUTES ===

// Checkout page
router.get('/checkout', async (req, res) => {
    try {
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id);

        if (cartItems.length === 0) {
            return res.redirect('/user/cart');
        }

        res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            errors: [],
            formData: {
                customer_name: req.session.user.username,
                customer_email: req.session.user.email
            }
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.redirect('/user/cart');
    }
});

// Process checkout
router.post('/checkout', [
    body('customer_name').trim().notEmpty().withMessage('Name is required'),
    body('customer_email').trim().isEmail().withMessage('Valid email is required'),
    body('shipping_address').trim().notEmpty().withMessage('Shipping address is required')
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id);

        return res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            errors: errors.array(),
            formData: req.body
        });
    }

    try {
        const order = await Order.create(req.session.user.id, req.body);
        res.redirect(`/user/orders/${order.id}?success=true`);
    } catch (error) {
        console.error('Checkout error:', error);
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id);

        res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            errors: [{ msg: 'Unable to process order. Please try again.' }],
            formData: req.body
        });
    }
});

// === ORDER ROUTES ===

// Order history
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.findByUser(req.session.user.id);

        res.render('user/orders', {
            title: 'Order History',
            orders
        });
    } catch (error) {
        console.error('Order history error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load orders'
        });
    }
});

// Order detail
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order || order.user_id !== req.session.user.id) {
            return res.status(404).render('public/404', { title: 'Order Not Found' });
        }

        const orderItems = await Order.getItems(order.id);

        res.render('user/order-detail', {
            title: `Order #${order.order_number}`,
            order,
            orderItems,
            success: req.query.success === 'true'
        });
    } catch (error) {
        console.error('Order detail error:', error);
        res.redirect('/user/orders');
    }
});

// === INQUIRY ROUTES ===

// User's inquiries
router.get('/inquiries', async (req, res) => {
    try {
        const inquiries = await Inquiry.findByUser(req.session.user.id);

        res.render('user/inquiries', {
            title: 'My Inquiries',
            inquiries
        });
    } catch (error) {
        console.error('Inquiries error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load inquiries'
        });
    }
});

module.exports = router;
