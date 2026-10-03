const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Collection = require('../models/Collection');
const PendingCard = require('../models/PendingCard');
const Card = require('../models/Card');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const Settings = require('../models/Settings');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const pendingUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/'),
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'pending-' + unique + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
            && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
        cb(null, ok);
    }
});

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
        const [collection, figurines, completionStats] = await Promise.all([
            Collection.findByUser(req.session.user.id, status),
            Collection.getFigurinesByUser(req.session.user.id, status),
            status === 'have' ? Collection.getCompletionStats(req.session.user.id) : Promise.resolve({}),
        ]);

        res.render('user/collection', {
            title: 'My Collection',
            collection,
            figurines,
            status,
            completionStats
        });
    } catch (error) {
        console.error('Collection error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load collection'
        });
    }
});

// Search catalogue + pending cards (AJAX)
router.get('/collection/search.json', async (req, res) => {
    const term = (req.query.q || '').trim();
    if (term.length < 2) return res.json({ catalogue: [], pending: [] });
    try {
        const [catalogue, pending] = await Promise.all([
            Card.search(term),
            PendingCard.search(term)
        ]);
        res.json({ catalogue, pending });
    } catch (err) {
        console.error('Collection search error:', err);
        res.status(500).json({ catalogue: [], pending: [] });
    }
});

// Add to collection — search-first form
router.get('/collection/add', (req, res) => {
    res.render('user/collection-add', {
        title: 'Add to Collection',
        status: req.query.status || 'have',
        errors: [],
        formData: {}
    });
});

// Add to collection handler — three paths: catalogue card, existing pending, or new submission
router.post('/collection/add', pendingUpload.single('image_front'), [
    body('status').isIn(['have', 'want']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    const status = req.body.status || 'have';

    if (!errors.isEmpty()) {
        return res.render('user/collection-add', {
            title: 'Add to Collection',
            status,
            errors: errors.array(),
            formData: req.body
        });
    }

    const userId = req.session.user.id;

    try {
        // Path 1: linking to a catalogue card
        if (req.body.card_id) {
            const cardId = parseInt(req.body.card_id);
            const existing = await Collection.hasCard(userId, cardId, status);
            if (!existing) {
                const card = await Card.findById(cardId);
                if (card) {
                    await Collection.addFromCatalogue(userId, card, status);
                }
            }
            return res.redirect('/user/collection?status=' + status);
        }

        // Path 2: linking to an existing pending card
        if (req.body.pending_card_id) {
            const pendingId = parseInt(req.body.pending_card_id);
            const existing = await Collection.hasPendingCard(userId, pendingId, status);
            if (!existing) {
                const pending = await PendingCard.findById(pendingId);
                if (pending) {
                    await Collection.addFromPending(userId, pendingId, pending, status);
                }
            }
            return res.redirect('/user/collection?status=' + status);
        }

        // Path 3: brand new submission
        const { card_name, set_name, card_number, manufacturer, insert_list, year, card_category, sport_type, notes } = req.body;

        if (!card_name || !card_name.trim()) {
            return res.render('user/collection-add', {
                title: 'Add to Collection',
                status,
                errors: [{ msg: 'Card name is required' }],
                formData: req.body
            });
        }

        const imagePath = req.file ? '/uploads/' + req.file.filename : null;
        const pending = await PendingCard.create(userId, {
            card_name: card_name.trim(),
            set_name, card_number, manufacturer, insert_list, year,
            card_category: card_category || 'non_sport',
            sport_type, notes,
            image_front: imagePath
        });
        await Collection.addFromPending(userId, pending.id, pending, status);
        res.redirect('/user/collection?status=' + status);

    } catch (err) {
        console.error('Add to collection error:', err);
        res.render('user/collection-add', {
            title: 'Add to Collection',
            status,
            errors: [{ msg: 'Unable to add card to collection' }],
            formData: req.body
        });
    }
});

// Set collection checklist — list all sets with progress
router.get('/collection/sets', async (req, res) => {
    try {
        const sets = await Collection.getSetProgress(req.session.user.id);
        const setsWithPct = sets.map(s => ({
            ...s,
            pct: s.total > 0 ? Math.round((s.have / s.total) * 100) : 0
        }));
        res.render('user/collection-sets', { title: 'Browse Sets', sets: setsWithPct });
    } catch (err) {
        console.error('Collection sets error:', err);
        res.render('public/error', { title: 'Error', message: 'Unable to load sets' });
    }
});

// Set collection checklist — cards in a specific set
router.get('/collection/sets/:set', async (req, res) => {
    try {
        const setName = decodeURIComponent(req.params.set);
        const cards = await Collection.getSetCards(req.session.user.id, setName);
        if (!cards.length) return res.status(404).render('public/error', { title: 'Not Found', message: 'Set not found or has no available cards' });
        const have = cards.filter(c => c.user_has).length;
        res.render('user/collection-set-checklist', {
            title: `${setName} Checklist`,
            setName, cards, have, total: cards.length
        });
    } catch (err) {
        console.error('Collection set checklist error:', err);
        res.render('public/error', { title: 'Error', message: 'Unable to load set checklist' });
    }
});

// Edit collection item
router.get('/collection/:id/edit', async (req, res) => {
    try {
        const item = await Collection.findById(req.params.id, req.session.user.id);

        if (!item) {
            return res.status(404).render('public/404', { title: 'Not Found' });
        }

        const sportTypes = await Card.getSportTypes();

        res.render('user/collection-edit', {
            title: 'Edit Collection Item',
            item,
            sportTypes,
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

// Toggle card in/out of 'have' collection
router.post('/collection/toggle/:card_id', async (req, res) => {
    const cardId = parseInt(req.params.card_id);
    const variationId = req.body.variation_id ? parseInt(req.body.variation_id) : null;
    try {
        const active = await Collection.toggleHave(req.session.user.id, cardId, variationId);
        const stats = await Collection.getCardStats(cardId);
        res.json({ success: true, active, stats });
    } catch (error) {
        console.error('Collection toggle error:', error);
        res.status(500).json({ success: false });
    }
});

// Toggle figurine in/out of collection
router.post('/collection/toggle-figurine/:figurine_id', async (req, res) => {
    const figurineId = parseInt(req.params.figurine_id);
    const status = req.body.status === 'want' ? 'want' : 'have';
    try {
        const active = await Collection.toggleFigurine(req.session.user.id, figurineId, status);
        res.json({ success: true, active, status });
    } catch (error) {
        console.error('Figurine toggle error:', error);
        res.status(500).json({ success: false });
    }
});

// Toggle card in/out of 'want' collection
router.post('/collection/want/:card_id', async (req, res) => {
    const cardId = parseInt(req.params.card_id);
    const variationId = req.body.variation_id ? parseInt(req.body.variation_id) : null;
    try {
        const active = await Collection.toggleWant(req.session.user.id, cardId, variationId);
        const stats = await Collection.getCardStats(cardId);
        res.json({ success: true, active, stats });
    } catch (error) {
        console.error('Collection want toggle error:', error);
        res.status(500).json({ success: false });
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
        const isSocietyMember = req.session.user.is_society_member || false;
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id, isSocietyMember);

        res.render('user/cart', {
            title: 'Shopping Cart',
            cartItems,
            total,
            stockError: req.query.error === 'stock'
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
        const { card_id, figurine_id, accessory_id, variant_label, variation_id, quantity } = req.body;
        const isSocietyMember = req.session.user.is_society_member || false;
        let unitPrice = null;

        // Resolve price for accessories (handle variants)
        if (accessory_id) {
            const Accessory = require('../models/Accessory');
            const accessory = await Accessory.findById(accessory_id);
            if (accessory) {
                if (variant_label && accessory.variants) {
                    const variants = typeof accessory.variants === 'string' ? JSON.parse(accessory.variants) : accessory.variants;
                    const variant = variants.find(v => v.label === variant_label);
                    if (variant) {
                        unitPrice = (isSocietyMember && variant.society_price && variant.society_price < variant.price)
                            ? variant.society_price : variant.price;
                    }
                }
                if (!unitPrice) {
                    unitPrice = (isSocietyMember && accessory.society_price && accessory.society_price < accessory.price_nzd)
                        ? accessory.society_price : accessory.price_nzd;
                }
            }
        }

        // Resolve variation price if specified
        if (card_id && variation_id) {
            const CardVariation = require('../models/CardVariation');
            const variation = await CardVariation.findById(parseInt(variation_id));
            if (variation) unitPrice = parseFloat(variation.price_nzd);
        }

        await Cart.addItem(req.session.user.id, {
            card_id: card_id || null,
            figurine_id: figurine_id || null,
            accessory_id: accessory_id || null,
            variant_label: variant_label || null,
            variation_id: variation_id ? parseInt(variation_id) : null,
            unit_price: unitPrice,
            quantity: parseInt(quantity) || 1
        });

        res.redirect('/user/cart');
    } catch (error) {
        console.error('Add to cart error:', error);
        if (error.message === 'Insufficient stock') {
            return res.redirect('/user/cart?error=stock');
        }
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
        const isSocietyMember = req.session.user.is_society_member || false;
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id, isSocietyMember);
        const shippingRates = await Settings.getShippingRates();

        if (cartItems.length === 0) {
            return res.redirect('/user/cart');
        }

        const hasOversizedItems = cartItems.some(item => item.card_product_type === 'box' || item.card_product_type === 'pack');
        const hasAccessoriesOrFigurines = cartItems.some(item => item.accessory_id || item.figurine_id);

        // Default shipping method to match what's actually in the cart, rather than always the priciest option
        let defaultShippingMethod = 'small';
        if (hasAccessoriesOrFigurines) {
            defaultShippingMethod = 'large';
        } else if (hasOversizedItems) {
            defaultShippingMethod = 'medium';
        }

        res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            shippingRates,
            hasOversizedItems,
            errors: [],
            formData: {
                customer_name: req.session.user.username,
                customer_email: req.session.user.email,
                shipping_method: defaultShippingMethod
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
    body('shipping_address').if((value, { req }) => req.body.shipping_method !== 'pickup').trim().notEmpty().withMessage('Shipping address is required')
], async (req, res) => {
    const errors = validationResult(req);

    const isSocietyMember = req.session.user.is_society_member || false;

    if (!errors.isEmpty()) {
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id, isSocietyMember);
        const shippingRates = await Settings.getShippingRates();
        const hasOversizedItems = cartItems.some(item => item.card_product_type === 'box' || item.card_product_type === 'pack');

        return res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            shippingRates,
            hasOversizedItems,
            errors: errors.array(),
            formData: req.body
        });
    }

    try {
        // Look up shipping cost from settings based on selected method
        let shippingCost = 0;
        const method = req.body.shipping_method;
        if (method && method !== 'pickup' && method !== 'tbc') {
            const shippingRates = await Settings.getShippingRates();
            if (method === 'small') shippingCost = shippingRates.small.price;
            else if (method === 'medium') shippingCost = shippingRates.medium.price;
            else if (method === 'large') shippingCost = shippingRates.large.price;
        }

        const orderData = {
            ...req.body,
            shipping_cost: shippingCost,
            shipping_method: method,
            payment_method: req.body.payment_method || 'bank_transfer'
        };

        const order = await Order.create(req.session.user.id, orderData);
        res.redirect(`/user/orders/${order.id}?success=true`);
    } catch (error) {
        console.error('Checkout error:', error);
        const cartItems = await Cart.getByUser(req.session.user.id);
        const total = await Cart.getTotal(req.session.user.id, isSocietyMember);
        const shippingRates = await Settings.getShippingRates();
        const hasOversizedItems = cartItems.some(item => item.card_product_type === 'box' || item.card_product_type === 'pack');
        const errorMsg = error.message && error.message.startsWith('Insufficient stock')
            ? "Sorry, one or more items in your cart just sold out. Please update your cart and try again."
            : 'Unable to process order. Please try again.';

        res.render('user/checkout', {
            title: 'Checkout',
            cartItems,
            total,
            shippingRates,
            hasOversizedItems,
            errors: [{ msg: errorMsg }],
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
        const bankDetails = await Settings.getBankDetails();

        res.render('user/order-detail', {
            title: `Order #${order.order_number}`,
            order,
            orderItems,
            bankDetails,
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
