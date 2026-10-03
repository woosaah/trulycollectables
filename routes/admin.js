const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const Card = require('../models/Card');
const CardImage = require('../models/CardImage');
const Accessory = require('../models/Accessory');
const Figurine = require('../models/Figurine');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const Collection = require('../models/Collection');
const CsvImport = require('../models/CsvImport');
const Set = require('../models/Set');
const CardVariation = require('../models/CardVariation');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Player = require('../models/Player');
const PlayerImport = require('../models/PlayerImport');
const TestRunner = require('../services/TestRunner');
const Ticket = require('../models/Ticket');
const { searchListings } = require('../services/ebayService');
const PendingCard = require('../models/PendingCard');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// All routes require admin authentication
router.use(requireAdmin);

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Admin dashboard
router.get('/', async (req, res) => {
    try {
        const pendingOrders = await Order.findAll({ status: 'pending' });
        const pendingFigurines = await Figurine.getPending();
        const newInquiries = await Inquiry.findAll('new');
        const allUsers = await User.findAll();
        let ticketCounts = { open: 0, in_progress: 0, resolved: 0 };
        try { ticketCounts = await Ticket.countByStatus(); } catch (e) { /* tickets table may not exist yet */ }

        const stockResult = await pool.query(
            `SELECT COALESCE(SUM(quantity), 0) as total_stock,
                    COALESCE(SUM(quantity * price_nzd), 0) as total_value
             FROM cards WHERE available = true`
        );

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            pendingOrdersCount: pendingOrders.length,
            pendingFigurinesCount: pendingFigurines.length,
            newInquiriesCount: newInquiries.length,
            usersCount: allUsers.length,
            openTicketsCount: ticketCounts.open,
            totalStock: parseInt(stockResult.rows[0].total_stock),
            totalValue: parseFloat(stockResult.rows[0].total_value).toFixed(2)
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load dashboard'
        });
    }
});

// === MANUFACTURER & SET MANAGEMENT API ===

// Get all manufacturers
router.get('/api/manufacturers', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM manufacturers ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get manufacturers error:', error);
        res.status(500).json({ error: 'Failed to fetch manufacturers' });
    }
});

// Add new manufacturer
router.post('/api/manufacturers', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Manufacturer name is required' });
        }

        const result = await pool.query(
            'INSERT INTO manufacturers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
            [name.trim()]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Add manufacturer error:', error);
        res.status(500).json({ error: 'Failed to add manufacturer' });
    }
});

// Get sets by manufacturer
router.get('/api/manufacturers/:id/sets', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, set_name, year FROM card_sets WHERE manufacturer_id = $1 ORDER BY set_name',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get sets error:', error);
        res.status(500).json({ error: 'Failed to fetch sets' });
    }
});

// Add new set
router.post('/api/sets', async (req, res) => {
    try {
        const { manufacturer_id, set_name, year } = req.body;
        if (!manufacturer_id || !set_name || set_name.trim() === '') {
            return res.status(400).json({ error: 'Manufacturer and set name are required' });
        }

        const result = await pool.query(
            `INSERT INTO card_sets (manufacturer_id, set_name, year)
             VALUES ($1, $2, $3)
             ON CONFLICT (manufacturer_id, set_name)
             DO UPDATE SET year = EXCLUDED.year
             RETURNING id, set_name, year`,
            [manufacturer_id, set_name.trim(), year || null]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Add set error:', error);
        res.status(500).json({ error: 'Failed to add set' });
    }
});

// Get inserts by set
router.get('/api/sets/:id/inserts', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, insert_name, description FROM card_inserts WHERE card_set_id = $1 ORDER BY insert_name',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get inserts error:', error);
        res.status(500).json({ error: 'Failed to fetch inserts' });
    }
});

// Add new insert
router.post('/api/inserts', async (req, res) => {
    try {
        const { card_set_id, insert_name, description } = req.body;
        if (!card_set_id || !insert_name || insert_name.trim() === '') {
            return res.status(400).json({ error: 'Set and insert name are required' });
        }

        const result = await pool.query(
            `INSERT INTO card_inserts (card_set_id, insert_name, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (card_set_id, insert_name)
             DO UPDATE SET description = EXCLUDED.description
             RETURNING id, insert_name, description`,
            [card_set_id, insert_name.trim(), description || null]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Add insert error:', error);
        res.status(500).json({ error: 'Failed to add insert' });
    }
});

// === SPORT TYPES API ===

// Get all sport types
router.get('/api/sport-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM sport_types ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get sport types error:', error);
        res.status(500).json({ error: 'Failed to fetch sport types' });
    }
});

// Add new sport type
router.post('/api/sport-types', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Sport type name is required' });
        }

        const result = await pool.query(
            `INSERT INTO sport_types (name)
             VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id, name`,
            [name.trim()]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Add sport type error:', error);
        res.status(500).json({ error: 'Failed to add sport type' });
    }
});

// === USER WANTS/COLLECTIONS ===

// View all wanted cards
router.get('/wants', async (req, res) => {
    try {
        const [mostWanted, userSummary] = await Promise.all([
            Collection.getMostWanted(10),
            Collection.getUserWantSummary()
        ]);

        res.render('admin/wants', {
            title: 'User Wanted Cards',
            user: req.session.user,
            mostWanted,
            userSummary
        });
    } catch (error) {
        console.error('Get wanted cards error:', error);
        res.status(500).render('public/error', {
            title: 'Error',
            user: req.session.user,
            isAdmin: true,
            message: 'Unable to load wanted cards'
        });
    }
});

// === CARD INVENTORY MANAGEMENT ===

// List all cards
router.get('/cards', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const allowedLimits = [50, 100, 200, 500, 1000];
        const limit = allowedLimits.includes(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 50;
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            card_category: req.query.card_category,
            sport_type: req.query.sport_type,
            set_name: req.query.set_name,
            sort: req.query.sort || 'card_number',
            order: req.query.order || 'asc',
        };

        const [cards, totalCards, sportTypes, setNames] = await Promise.all([
            Card.findAll(filters, limit, offset, true),
            Card.count(filters, true),
            Card.getSportTypes(),
            Card.getSets(),
        ]);
        const totalPages = Math.ceil(totalCards / limit);

        res.render('admin/cards', {
            title: 'Manage Cards',
            cards,
            filters,
            sportTypes,
            setNames,
            currentPage: page,
            totalPages,
            limit,
            allowedLimits,
            currentUrl: req.originalUrl,
        });
    } catch (error) {
        console.error('Admin cards error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load cards'
        });
    }
});

// Add card form
router.get('/cards/add', (req, res) => {
    res.render('admin/card-add', {
        title: 'Add Card',
        errors: [],
        formData: {}
    });
});

// Add card handler
router.post('/cards/add',
    upload.fields([{ name: 'image_front', maxCount: 1 }, { name: 'image_back', maxCount: 1 }]),
    [
        body('card_name').trim().notEmpty().withMessage('Card name is required'),
        body('price_nzd').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('admin/card-add', {
                title: 'Add Card',
                errors: errors.array(),
                formData: req.body
            });
        }

        try {
            const cardData = {
                ...req.body,
                image_front: req.files?.image_front ? `/uploads/${req.files.image_front[0].filename}` : null,
                image_back: req.files?.image_back ? `/uploads/${req.files.image_back[0].filename}` : null
            };

            const newCard = await Card.create(cardData);
            if (newCard && cardData.set_name) {
                await Set.applyParallelsToCard(newCard.id, cardData.set_name);
            }
            res.redirect('/admin/cards?success=added');
        } catch (error) {
            console.error('Add card error:', error);
            res.render('admin/card-add', {
                title: 'Add Card',
                errors: [{ msg: 'Unable to add card' }],
                formData: req.body
            });
        }
    }
);

// Edit card form
router.get('/cards/:id/edit', async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).render('public/404', { title: 'Card Not Found' });
        }

        const additionalImages = await CardImage.getByCardId(req.params.id);
        const variations = await CardVariation.getByCardId(req.params.id);

        res.render('admin/card-edit', {
            title: 'Edit Card',
            card,
            additionalImages,
            variations,
            errors: [],
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Edit card error:', error);
        res.redirect('/admin/cards');
    }
});

// eBay price lookup
router.get('/cards/:id/ebay-check', async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) return res.status(404).json({ error: 'Card not found' });
        const result = await searchListings(card);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update card handler
router.post('/cards/:id/edit',
    upload.fields([{ name: 'image_front', maxCount: 1 }, { name: 'image_back', maxCount: 1 }]),
    async (req, res) => {
        try {
            const updates = { ...req.body };

            // set_name is a disabled/informational field on the edit form (populated via a
            // manufacturer->sets cascade) and must never be written here — when that cascade
            // fails to match, the field submits empty and silently wipes the card's set.
            // Confirmed cause of a card 'disappearing' from set-filtered admin views 2026-08-15.
            delete updates.set_name;

            if (req.files?.image_front) {
                updates.image_front = `/uploads/${req.files.image_front[0].filename}`;
            }

            if (req.files?.image_back) {
                updates.image_back = `/uploads/${req.files.image_back[0].filename}`;
            }

            // Convert empty strings to null for nullable fields to avoid type errors
            ['player_id', 'year', 'insert_list', 'variation', 'team', 'notes'].forEach(field => {
                if (updates[field] === '') updates[field] = null;
            });
            // Checkbox isn't submitted when unchecked — explicitly set boolean
            updates.is_rookie_card = req.body.is_rookie_card === 'on';

            await Card.update(req.params.id, updates);
            res.redirect('/admin/cards?success=updated');
        } catch (error) {
            console.error('Update card error:', error);
            res.redirect('/admin/cards');
        }
    }
);

// Delete card
router.post('/cards/:id/delete', async (req, res) => {
    try {
        await Card.delete(req.params.id);
        res.redirect('/admin/cards?success=deleted');
    } catch (error) {
        console.error('Delete card error:', error);
        res.redirect('/admin/cards');
    }
});

// Update card quantity
router.post('/cards/:id/update-quantity', async (req, res) => {
    // Referer header is unreliable (privacy settings, referrer-policy) — the form now
    // passes the exact current URL explicitly so this doesn't bounce to the wrong page.
    const fallback = req.body.return_to || '/admin/cards';
    try {
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.redirect(fallback);
        }
        await Card.update(req.params.id, { quantity });
        res.redirect(fallback);
    } catch (error) {
        console.error('Update card quantity error:', error);
        res.redirect('/admin/cards');
    }
});

// Toggle card availability
router.post('/cards/:id/toggle-availability', async (req, res) => {
    const fallback = req.body.return_to || '/admin/cards';
    try {
        const card = await Card.findById(req.params.id);
        await Card.update(req.params.id, { available: !card.available });
        res.redirect(fallback);
    } catch (error) {
        console.error('Toggle availability error:', error);
        res.redirect('/admin/cards');
    }
});

// === CARD IMAGE MANAGEMENT ===

// Add multiple images to card
router.post('/cards/:id/images/add',
    upload.array('images', 10), // Allow up to 10 images
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.redirect(`/admin/cards/${req.params.id}/edit?error=no_images`);
            }

            const images = req.files.map((file, index) => ({
                url: `/uploads/${file.filename}`,
                type: req.body[`image_type_${index}`] || 'detail',
                order: index
            }));

            await CardImage.addMultiple(req.params.id, images);
            res.redirect(`/admin/cards/${req.params.id}/edit?success=images_added`);
        } catch (error) {
            console.error('Add images error:', error);
            res.redirect(`/admin/cards/${req.params.id}/edit?error=add_failed`);
        }
    }
);

// Delete card image
router.post('/cards/:cardId/images/:imageId/delete', async (req, res) => {
    try {
        const deletedImage = await CardImage.delete(req.params.imageId);

        // Delete physical file
        if (deletedImage && deletedImage.image_url) {
            const filePath = path.join(__dirname, '..', deletedImage.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.redirect(`/admin/cards/${req.params.cardId}/edit?success=image_deleted`);
    } catch (error) {
        console.error('Delete image error:', error);
        res.redirect(`/admin/cards/${req.params.cardId}/edit?error=delete_failed`);
    }
});

// === FIGURINE MANAGEMENT ===

// List all figurines
router.get('/figurines', async (req, res) => {
    try {
        const approved = await Figurine.findAll(true);
        const pending = await Figurine.getPending();

        res.render('admin/figurines', {
            title: 'Manage Figurines',
            approved,
            pending
        });
    } catch (error) {
        console.error('Admin figurines error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load figurines'
        });
    }
});

// Approve figurine
router.post('/figurines/:id/approve', async (req, res) => {
    try {
        await Figurine.approve(req.params.id);
        res.redirect('/admin/figurines?success=approved');
    } catch (error) {
        console.error('Approve figurine error:', error);
        res.redirect('/admin/figurines');
    }
});

// Show edit figurine form
router.get('/figurines/:id/edit', async (req, res) => {
    try {
        const figurine = await Figurine.findById(req.params.id);
        if (!figurine) {
            return res.redirect('/admin/figurines');
        }
        res.render('admin/figurine-edit', {
            title: 'Edit Figurine',
            figurine,
            errors: []
        });
    } catch (error) {
        console.error('Edit figurine error:', error);
        res.redirect('/admin/figurines');
    }
});

// Update figurine
router.post('/figurines/:id/edit',
    upload.single('image'),
    [
        body('product_name').trim().notEmpty().withMessage('Product name is required'),
        body('price_nzd').isFloat({ min: 0 }).withMessage('Valid NZD price is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const figurine = await Figurine.findById(req.params.id);
            return res.render('admin/figurine-edit', {
                title: 'Edit Figurine',
                figurine: { ...figurine, ...req.body },
                errors: errors.array()
            });
        }

        try {
            const updates = {
                product_name: req.body.product_name,
                description: req.body.description || null,
                price_aud: req.body.price_aud || null,
                price_nzd: req.body.price_nzd,
                quantity: parseInt(req.body.quantity) || 0,
                supplier: req.body.supplier || null,
                sku: req.body.sku || null,
                small_bag_qty: req.body.small_bag_qty ? parseInt(req.body.small_bag_qty) : null,
                medium_bag_qty: req.body.medium_bag_qty ? parseInt(req.body.medium_bag_qty) : null,
                large_bag_qty: req.body.large_bag_qty ? parseInt(req.body.large_bag_qty) : null
            };

            if (req.file) {
                updates.image_url = `/uploads/${req.file.filename}`;
            }

            await Figurine.update(req.params.id, updates);
            res.redirect('/admin/figurines');
        } catch (error) {
            console.error('Update figurine error:', error);
            const figurine = await Figurine.findById(req.params.id);
            res.render('admin/figurine-edit', {
                title: 'Edit Figurine',
                figurine,
                errors: [{ msg: 'Failed to update figurine' }]
            });
        }
    }
);

// Update figurine quantity
router.post('/figurines/:id/update-quantity', async (req, res) => {
    try {
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.redirect('/admin/figurines');
        }
        await Figurine.update(req.params.id, { quantity });
        res.redirect('/admin/figurines');
    } catch (error) {
        console.error('Update figurine quantity error:', error);
        res.redirect('/admin/figurines');
    }
});

// Delete figurine
router.post('/figurines/:id/delete', async (req, res) => {
    try {
        await Figurine.delete(req.params.id);
        res.redirect('/admin/figurines?success=deleted');
    } catch (error) {
        console.error('Delete figurine error:', error);
        res.redirect('/admin/figurines');
    }
});

// === ORDER MANAGEMENT ===

// List all orders
router.get('/orders', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };

        const orders = await Order.findAll(filters);

        res.render('admin/orders', {
            title: 'Manage Orders',
            orders,
            filters
        });
    } catch (error) {
        console.error('Admin orders error:', error);
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

        if (!order) {
            return res.status(404).render('public/404', { title: 'Order Not Found' });
        }

        const orderItems = await Order.getItems(order.id);
        const messagesResult = await pool.query(
            'SELECT * FROM order_messages WHERE order_id = $1 ORDER BY created_at ASC',
            [order.id]
        );
        const shippingRates = await Settings.getShippingRates();

        res.render('admin/order-detail', {
            title: `Order #${order.order_number}`,
            order,
            orderItems,
            messages: messagesResult.rows,
            shippingRates,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Order detail error:', error);
        res.redirect('/admin/orders');
    }
});

// Update order status
router.post('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await Order.updateStatus(req.params.id, status);
        res.redirect(`/admin/orders/${req.params.id}?success=status_updated`);
    } catch (error) {
        console.error('Update order status error:', error);
        res.redirect('/admin/orders');
    }
});

// Update tracking information
router.post('/orders/:id/tracking', async (req, res) => {
    try {
        const { tracking_number, tracking_url, shipping_cost } = req.body;
        const order = await Order.findById(req.params.id);

        await pool.query(
            'UPDATE orders SET tracking_number = $1, tracking_url = $2, shipping_cost = $3 WHERE id = $4',
            [tracking_number || null, tracking_url || null, shipping_cost || 0, req.params.id]
        );

        // Send tracking email to customer if tracking number provided
        if (tracking_number) {
            const emailService = require('../services/emailService');
            const updatedOrder = await Order.findById(req.params.id);
            try {
                await emailService.sendTrackingUpdate(updatedOrder);
            } catch (emailError) {
                console.error('Failed to send tracking email:', emailError);
            }
        }

        res.redirect(`/admin/orders/${req.params.id}?success=tracking_updated`);
    } catch (error) {
        console.error('Update tracking error:', error);
        res.redirect(`/admin/orders/${req.params.id}`);
    }
});

// Update admin notes
router.post('/orders/:id/notes', async (req, res) => {
    try {
        await pool.query('UPDATE orders SET admin_notes = $1 WHERE id = $2',
            [req.body.admin_notes || null, req.params.id]);
        res.redirect(`/admin/orders/${req.params.id}?success=notes_updated`);
    } catch (error) {
        console.error('Update notes error:', error);
        res.redirect(`/admin/orders/${req.params.id}`);
    }
});

// Log order message (comms log)
router.post('/orders/:id/messages', async (req, res) => {
    try {
        const { direction, notes } = req.body;
        if (!notes || !notes.trim()) return res.redirect(`/admin/orders/${req.params.id}`);
        await pool.query(
            'INSERT INTO order_messages (order_id, direction, notes, logged_by) VALUES ($1, $2, $3, $4)',
            [req.params.id, direction === 'in' ? 'in' : 'out', notes.trim(), req.session.user.id]
        );
        res.redirect(`/admin/orders/${req.params.id}`);
    } catch (error) {
        console.error('Log message error:', error);
        res.redirect(`/admin/orders/${req.params.id}`);
    }
});

// === INQUIRY MANAGEMENT ===

// List all inquiries
router.get('/inquiries', async (req, res) => {
    try {
        const status = req.query.status || null;
        const inquiries = await Inquiry.findAll(status);

        res.render('admin/inquiries', {
            title: 'Manage Inquiries',
            inquiries,
            currentStatus: status
        });
    } catch (error) {
        console.error('Admin inquiries error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load inquiries'
        });
    }
});

// View inquiry detail
router.get('/inquiries/:id', async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).render('public/404', { title: 'Inquiry Not Found' });
        }

        res.render('admin/inquiry-detail', {
            title: 'Inquiry Detail',
            inquiry
        });
    } catch (error) {
        console.error('Inquiry detail error:', error);
        res.redirect('/admin/inquiries');
    }
});

// Update inquiry status
router.post('/inquiries/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await Inquiry.updateStatus(req.params.id, status);
        res.redirect('/admin/inquiries?success=updated');
    } catch (error) {
        console.error('Update inquiry status error:', error);
        res.redirect('/admin/inquiries');
    }
});

// === CSV BULK IMPORT ===

// Configure CSV file upload
const csvUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/csv/');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /csv|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype === 'text/csv' || file.mimetype === 'text/plain';

        if (mimetype || extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'));
        }
    }
});

// Ensure CSV upload directory exists
if (!fs.existsSync('uploads/csv')) {
    fs.mkdirSync('uploads/csv', { recursive: true });
}

// CSV Import page
router.get('/csv-import', (req, res) => {
    const errorMessages = {
        session_expired: 'Session expired — please re-upload your CSV and try again.',
        import_failed: 'Import failed — re-upload your CSV and try again.'
    };
    res.render('admin/csv-import', {
        title: 'Bulk CSV Import',
        errors: [],
        errorMessage: errorMessages[req.query.error] || null
    });
});

// Download CSV template
router.get('/csv-import/template', (req, res) => {
    const template = CsvImport.generateTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=card_import_template.csv');
    res.send(template.csv);
});

// Upload and preview CSV
router.post('/csv-import/upload', csvUpload.single('csv_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.render('admin/csv-import', {
                title: 'Bulk CSV Import',
                errors: [{ msg: 'Please select a CSV file to upload' }]
            });
        }

        // Parse CSV with column mapping from form
        const columnMapping = {
            card_name: req.body.col_card_name || 'card_name',
            set_name: req.body.col_set_name || 'set_name',
            card_number: req.body.col_card_number || 'card_number',
            manufacturer: req.body.col_manufacturer || 'manufacturer',
            insert_list: req.body.col_insert_list || 'insert_list',
            year: req.body.col_year || 'year',
            card_category: req.body.col_card_category || 'card_category',
            sport_type: req.body.col_sport_type || 'sport_type',
            condition: req.body.col_condition || 'condition',
            price_nzd: req.body.col_price_nzd || 'price_nzd',
            quantity: req.body.col_quantity || 'quantity',
            image_front: req.body.col_image_front || 'image_front',
            image_back: req.body.col_image_back || 'image_back',
            description: req.body.col_description || 'description',
            team: req.body.col_team || 'team',
            variation: req.body.col_variation || 'variation',
            notes: req.body.col_notes || 'notes',
            is_rookie_card: req.body.col_is_rookie_card || 'is_rookie_card',
            product_type: req.body.col_product_type || 'product_type'
        };

        const parseResult = await CsvImport.parseCSV(req.file.path, columnMapping);

        // Detect duplicates
        const duplicateResult = await CsvImport.detectDuplicates(parseResult.results);

        // Store preview data in session
        req.session.csvPreview = {
            filePath: req.file.path,
            filename: req.file.originalname,
            columnMapping,
            validRows: parseResult.results.length,
            errorRows: parseResult.errors.length,
            duplicates: duplicateResult.duplicates.length,
            unique: duplicateResult.unique.length,
            errors: parseResult.errors,
            duplicateList: duplicateResult.duplicates.slice(0, 10), // First 10 duplicates
            sampleRows: parseResult.results.slice(0, 5) // First 5 rows
        };

        res.render('admin/csv-import-preview', {
            title: 'CSV Import Preview',
            preview: req.session.csvPreview
        });

    } catch (error) {
        console.error('CSV upload error:', error);

        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.render('admin/csv-import', {
            title: 'Bulk CSV Import',
            errors: [{ msg: `Upload failed: ${error.message}` }]
        });
    }
});

// Execute CSV import
router.post('/csv-import/execute', async (req, res) => {
    try {
        const preview = req.session.csvPreview;

        if (!preview || !fs.existsSync(preview.filePath)) {
            return res.redirect('/admin/csv-import?error=session_expired');
        }

        const duplicateAction = req.body.duplicate_action || 'skip'; // 'skip', 'update', 'merge'

        // Parse CSV again
        const parseResult = await CsvImport.parseCSV(preview.filePath, preview.columnMapping);

        // Execute import
        const importResult = await CsvImport.importCards(
            parseResult.results,
            req.session.user.id,
            preview.filename,
            duplicateAction
        );

        // Clean up uploaded file
        if (fs.existsSync(preview.filePath)) {
            fs.unlinkSync(preview.filePath);
        }

        // Clear session
        delete req.session.csvPreview;

        res.render('admin/csv-import-result', {
            title: 'Import Complete',
            result: importResult
        });

    } catch (error) {
        console.error('CSV import execution error:', error);
        res.redirect('/admin/csv-import?error=import_failed');
    }
});

// Import history
router.get('/csv-import/history', async (req, res) => {
    try {
        const history = await CsvImport.getImportHistory(50);

        res.render('admin/csv-import-history', {
            title: 'CSV Import History',
            imports: history
        });
    } catch (error) {
        console.error('Import history error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load import history'
        });
    }
});

// === UNIT TESTING & TEST RUNNER ===

// Test dashboard
router.get('/tests', (req, res) => {
    try {
        const availableTests = TestRunner.getAvailableTests();
        const coverage = TestRunner.getCoverageSummary();

        res.render('admin/test-dashboard', {
            title: 'Unit Testing Dashboard',
            availableTests,
            coverage
        });
    } catch (error) {
        console.error('Test dashboard error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load test dashboard'
        });
    }
});

// Run all tests
router.post('/tests/run-all', async (req, res) => {
    try {
        const results = await TestRunner.runAllTests();
        const formatted = TestRunner.formatResults(results);

        res.render('admin/test-results', {
            title: 'All Tests - Results',
            results: formatted,
            testType: 'all'
        });
    } catch (error) {
        console.error('Run all tests error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to run tests: ' + error.message
        });
    }
});

// Run model tests
router.post('/tests/run-model/:modelName', async (req, res) => {
    try {
        const modelName = req.params.modelName;
        const results = await TestRunner.runModelTests(modelName);
        const formatted = TestRunner.formatResults(results);

        res.render('admin/test-results', {
            title: `${modelName} Tests - Results`,
            results: formatted,
            testType: 'model',
            modelName
        });
    } catch (error) {
        console.error('Run model tests error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to run model tests: ' + error.message
        });
    }
});

// Run integration tests
router.post('/tests/run-integration', async (req, res) => {
    try {
        const results = await TestRunner.runIntegrationTests();
        const formatted = TestRunner.formatResults(results);

        res.render('admin/test-results', {
            title: 'Integration Tests - Results',
            results: formatted,
            testType: 'integration'
        });
    } catch (error) {
        console.error('Run integration tests error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to run integration tests: ' + error.message
        });
    }
});

// Get test coverage report
router.get('/tests/coverage', (req, res) => {
    try {
        const coveragePath = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');

        if (fs.existsSync(coveragePath)) {
            res.sendFile(coveragePath);
        } else {
            res.render('public/error', {
                title: 'Coverage Not Available',
                message: 'Please run tests first to generate coverage report'
            });
        }
    } catch (error) {
        console.error('Coverage report error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load coverage report'
        });
    }
});

// ===== ACCESSORIES MANAGEMENT =====

// List all accessories
router.get('/accessories', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            category: req.query.category
        };

        const [accessories, totalAccessories, categories] = await Promise.all([
            Accessory.findAll(filters, limit, offset, true),
            Accessory.count(filters, true),
            Accessory.getCategories()
        ]);

        const totalPages = Math.ceil(totalAccessories / limit);

        res.render('admin/accessories', {
            title: 'Manage Accessories',
            accessories,
            categories,
            filters,
            currentPage: page,
            totalPages,
            totalAccessories
        });
    } catch (error) {
        console.error('Accessories list error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load accessories' });
    }
});

// Show add accessory form
router.get('/accessories/add', (req, res) => {
    res.render('admin/accessory-add', {
        title: 'Add Accessory',
        errors: []
    });
});

// Add accessory
router.post('/accessories/add',
    upload.single('image'),
    [
        body('product_name').trim().notEmpty().withMessage('Product name is required'),
        body('price_nzd').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('quantity').isInt({ min: 0 }).withMessage('Valid quantity is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.render('admin/accessory-add', {
                    title: 'Add Accessory',
                    errors: errors.array()
                });
            }

            const accessoryData = {
                product_name: req.body.product_name,
                category: req.body.category,
                description: req.body.description,
                price_nzd: req.body.price_nzd,
                society_price: req.body.society_price || null,
                quantity: req.body.quantity,
                manufacturer: req.body.manufacturer,
                image_url: req.file ? `/uploads/${req.file.filename}` : null
            };

            await Accessory.create(accessoryData);
            res.redirect('/admin/accessories?success=added');
        } catch (error) {
            console.error('Add accessory error:', error);
            res.render('admin/accessory-add', {
                title: 'Add Accessory',
                errors: [{ msg: 'Failed to add accessory' }]
            });
        }
    }
);

// Show edit accessory form
router.get('/accessories/:id/edit', async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);
        if (!accessory) {
            return res.redirect('/admin/accessories?error=not_found');
        }

        res.render('admin/accessory-edit', {
            title: 'Edit Accessory',
            accessory,
            errors: []
        });
    } catch (error) {
        console.error('Edit accessory form error:', error);
        res.redirect('/admin/accessories?error=load_failed');
    }
});

// Update accessory
router.post('/accessories/:id/edit',
    upload.single('image'),
    [
        body('product_name').trim().notEmpty().withMessage('Product name is required'),
        body('price_nzd').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('quantity').isInt({ min: 0 }).withMessage('Valid quantity is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const accessory = await Accessory.findById(req.params.id);
                return res.render('admin/accessory-edit', {
                    title: 'Edit Accessory',
                    accessory,
                    errors: errors.array()
                });
            }

            const updates = {
                product_name: req.body.product_name,
                category: req.body.category,
                description: req.body.description,
                price_nzd: req.body.price_nzd,
                society_price: req.body.society_price || (req.body.price_nzd ? (req.body.price_nzd * 0.90).toFixed(2) : null),
                quantity: req.body.quantity,
                manufacturer: req.body.manufacturer,
                small_bag_qty: req.body.small_bag_qty ? parseInt(req.body.small_bag_qty) : null,
                medium_bag_qty: req.body.medium_bag_qty ? parseInt(req.body.medium_bag_qty) : null,
                large_bag_qty: req.body.large_bag_qty ? parseInt(req.body.large_bag_qty) : null
            };

            if (req.file) {
                updates.image_url = `/uploads/${req.file.filename}`;
            }

            await Accessory.update(req.params.id, updates);
            res.redirect('/admin/accessories?success=updated');
        } catch (error) {
            console.error('Update accessory error:', error);
            const accessory = await Accessory.findById(req.params.id);
            res.render('admin/accessory-edit', {
                title: 'Edit Accessory',
                accessory,
                errors: [{ msg: 'Failed to update accessory' }]
            });
        }
    }
);

// Delete accessory
router.post('/accessories/:id/delete', async (req, res) => {
    try {
        await Accessory.delete(req.params.id);
        res.redirect('/admin/accessories?success=deleted');
    } catch (error) {
        console.error('Delete accessory error:', error);
        res.redirect('/admin/accessories?error=delete_failed');
    }
});

// Update accessory variant quantities
router.post('/accessories/:id/update-variant-quantities', async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);
        if (!accessory || !accessory.variants) {
            return res.redirect('/admin/accessories');
        }
        let variants = typeof accessory.variants === 'string' ? JSON.parse(accessory.variants) : accessory.variants;
        let totalQty = 0;
        variants.forEach((v, i) => {
            const qty = parseInt(req.body[`qty_${i}`]) || 0;
            v.quantity = qty;
            totalQty += qty;
        });
        await pool.query('UPDATE accessories SET variants = $1, quantity = $2 WHERE id = $3',
            [JSON.stringify(variants), totalQty, req.params.id]);
        res.redirect('/admin/accessories');
    } catch (error) {
        console.error('Update variant quantities error:', error);
        res.redirect('/admin/accessories');
    }
});

// Update accessory quantity
router.post('/accessories/:id/update-quantity', async (req, res) => {
    try {
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.redirect('/admin/accessories');
        }
        await Accessory.update(req.params.id, { quantity });
        res.redirect('/admin/accessories');
    } catch (error) {
        console.error('Update accessory quantity error:', error);
        res.redirect('/admin/accessories');
    }
});

// Toggle availability
router.post('/accessories/:id/toggle-availability', async (req, res) => {
    try {
        await Accessory.toggleAvailability(req.params.id);
        res.redirect('/admin/accessories');
    } catch (error) {
        console.error('Toggle availability error:', error);
        res.redirect('/admin/accessories?error=toggle_failed');
    }
});

// =====================
// SETS MANAGEMENT
// =====================

// List all sets
router.get('/sets', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const filters = {
            sport_type: req.query.sport_type,
            manufacturer: req.query.manufacturer,
            search: req.query.search
        };

        const sets = await Set.findAll(filters, limit, offset);
        const totalSets = await Set.count(filters);
        const totalPages = Math.ceil(totalSets / limit);

        const sportTypes = await Set.getSportTypes();
        const manufacturers = await Set.getManufacturers();

        res.render('admin/sets', {
            title: 'Manage Sets',
            sets,
            filters,
            sportTypes,
            manufacturers,
            currentPage: page,
            totalPages,
            totalSets
        });
    } catch (error) {
        console.error('Sets list error:', error);
        res.status(500).send('Error loading sets');
    }
});

// Add set form
router.get('/sets/add', async (req, res) => {
    try {
        const sportTypes = await Card.getSportTypes();
        const manufacturers = await Card.getManufacturers();
        const subtypesResult = await pool.query('SELECT name FROM card_subtypes ORDER BY name');
        const cardSubtypes = subtypesResult.rows.map(r => r.name);

        res.render('admin/set-add', {
            title: 'Add Set',
            sportTypes,
            manufacturers,
            cardSubtypes,
            errors: []
        });
    } catch (error) {
        console.error('Set add form error:', error);
        res.status(500).send('Error loading form');
    }
});

// Create set
router.post('/sets/add', async (req, res) => {
    try {
        const setData = {
            set_name: req.body.set_name,
            manufacturer: req.body.manufacturer,
            year: req.body.year ? parseInt(req.body.year) : null,
            sport_type: req.body.sport_type,
            card_category: req.body.card_category,
            card_subtype: req.body.card_subtype || null,
            description: req.body.description,
            image_url: req.body.image_url
        };

        // Save new sport type if it doesn't exist
        if (setData.sport_type) {
            await pool.query('INSERT INTO sport_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [setData.sport_type]);
        }
        // Save new card subtype if it doesn't exist
        if (setData.card_subtype) {
            await pool.query('INSERT INTO card_subtypes (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [setData.card_subtype]);
        }

        await Set.create(setData);
        res.redirect('/admin/sets?success=created');
    } catch (error) {
        console.error('Set creation error:', error);
        const sportTypes = await Card.getSportTypes();
        const manufacturers = await Card.getManufacturers();
        const subtypesResult = await pool.query('SELECT name FROM card_subtypes ORDER BY name');
        const cardSubtypes = subtypesResult.rows.map(r => r.name);

        res.render('admin/set-add', {
            title: 'Add Set',
            sportTypes,
            manufacturers,
            cardSubtypes,
            errors: [{ msg: error.message }]
        });
    }
});

// Edit set form
router.get('/sets/:id/edit', async (req, res) => {
    try {
        const set = await Set.findById(req.params.id);
        if (!set) {
            return res.status(404).send('Set not found');
        }

        const sportTypes = await Card.getSportTypes();
        const manufacturers = await Card.getManufacturers();
        const subtypesResult = await pool.query('SELECT name FROM card_subtypes ORDER BY name');
        const cardSubtypes = subtypesResult.rows.map(r => r.name);
        const parallels = await Set.getParallels(req.params.id);

        const cardStatsResult = await pool.query(`
            SELECT
                COALESCE(NULLIF(TRIM(insert_list), ''), 'Base Set') as section,
                COUNT(*) as card_count,
                BOOL_AND(card_number ~ '^[0-9]+$') as all_numeric
            FROM cards
            WHERE set_name = $1
            GROUP BY COALESCE(NULLIF(TRIM(insert_list), ''), 'Base Set')
            ORDER BY section
        `, [set.set_name]);

        const baseSections = cardStatsResult.rows.filter(r => r.all_numeric);
        const specialSections = cardStatsResult.rows.filter(r => !r.all_numeric);

        res.render('admin/set-edit', {
            title: 'Edit Set',
            set,
            sportTypes,
            manufacturers,
            cardSubtypes,
            parallels,
            baseSections,
            specialSections,
            errors: [],
            success: req.query.success
        });
    } catch (error) {
        console.error('Set edit form error:', error);
        res.status(500).send('Error loading set');
    }
});

// Add parallel to set
router.post('/sets/:id/parallels/add', async (req, res) => {
    try {
        const { variation_name, default_price, sort_order, applies_to } = req.body;
        if (!variation_name) {
            return res.redirect(`/admin/sets/${req.params.id}/edit?error=name_required`);
        }
        await Set.addParallel(req.params.id, { variation_name, default_price, sort_order, applies_to });
        res.redirect(`/admin/sets/${req.params.id}/edit?success=parallel_added`);
    } catch (error) {
        console.error('Add parallel error:', error);
        res.redirect(`/admin/sets/${req.params.id}/edit?error=parallel_failed`);
    }
});

// Delete parallel from set
router.post('/sets/:id/parallels/:parallelId/delete', async (req, res) => {
    try {
        await Set.deleteParallel(req.params.parallelId);
        res.redirect(`/admin/sets/${req.params.id}/edit?success=parallel_deleted`);
    } catch (error) {
        console.error('Delete parallel error:', error);
        res.redirect(`/admin/sets/${req.params.id}/edit?error=parallel_delete_failed`);
    }
});

// Update set
router.post('/sets/:id/edit', async (req, res) => {
    try {
        const setData = {
            set_name: req.body.set_name,
            manufacturer: req.body.manufacturer,
            year: req.body.year ? parseInt(req.body.year) : null,
            sport_type: req.body.sport_type,
            card_category: req.body.card_category,
            card_subtype: req.body.card_subtype || null,
            description: req.body.description,
            image_url: req.body.image_url
        };

        // Save new sport type if it doesn't exist
        if (setData.sport_type) {
            await pool.query('INSERT INTO sport_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [setData.sport_type]);
        }
        // Save new card subtype if it doesn't exist
        if (setData.card_subtype) {
            await pool.query('INSERT INTO card_subtypes (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [setData.card_subtype]);
        }

        await Set.update(req.params.id, setData);
        res.redirect('/admin/sets?success=updated');
    } catch (error) {
        console.error('Set update error:', error);
        const set = await Set.findById(req.params.id);
        const sportTypes = await Card.getSportTypes();
        const manufacturers = await Card.getManufacturers();
        const subtypesResult = await pool.query('SELECT name FROM card_subtypes ORDER BY name');
        const cardSubtypes = subtypesResult.rows.map(r => r.name);

        res.render('admin/set-edit', {
            title: 'Edit Set',
            set,
            sportTypes,
            manufacturers,
            cardSubtypes,
            errors: [{ msg: error.message }]
        });
    }
});

// Delete set
router.post('/sets/:id/delete', async (req, res) => {
    try {
        await Set.delete(req.params.id);
        res.redirect('/admin/sets?success=deleted');
    } catch (error) {
        console.error('Set deletion error:', error);
        res.redirect('/admin/sets?error=delete_failed');
    }
});

// =====================
// USER MANAGEMENT
// =====================

// List all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll();
        res.render('admin/users', {
            title: 'Manage Users',
            users,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load users'
        });
    }
});

// Generate API key for user
router.post('/users/:id/generate-api-key', async (req, res) => {
    try {
        const apiKey = await User.generateApiKey(req.params.id);
        res.json({ success: true, apiKey });
    } catch (error) {
        console.error('Generate API key error:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

// Revoke API access
router.post('/users/:id/revoke-api-access', async (req, res) => {
    try {
        await User.revokeApiAccess(req.params.id);
        res.redirect('/admin/users?success=api_revoked');
    } catch (error) {
        console.error('Revoke API access error:', error);
        res.redirect('/admin/users?error=revoke_failed');
    }
});

// Toggle API access
router.post('/users/:id/toggle-api-access', async (req, res) => {
    try {
        const enabled = req.body.enabled === 'true';
        await User.toggleApiAccess(req.params.id, enabled);
        res.json({ success: true });
    } catch (error) {
        console.error('Toggle API access error:', error);
        res.status(500).json({ error: 'Failed to toggle API access' });
    }
});

// Toggle society membership
router.post('/users/:id/toggle-society-member', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.redirect('/admin/users?error=user_not_found');
        }
        await User.update(req.params.id, { is_society_member: !user.is_society_member });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Toggle society member error:', error);
        res.redirect('/admin/users?error=toggle_failed');
    }
});

// === SETTINGS ROUTES ===

// Settings page
router.get('/settings', async (req, res) => {
    try {
        const settings = await Settings.getAll();
        res.render('admin/settings', {
            title: 'Store Settings',
            settings,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Settings page error:', error);
        res.redirect('/admin');
    }
});

// Save bank details
router.post('/settings/bank', async (req, res) => {
    try {
        await Settings.setMultiple({
            bank_name: req.body.bank_name || '',
            bank_account_name: req.body.bank_account_name || '',
            bank_account_number: req.body.bank_account_number || '',
            bank_reference_instructions: req.body.bank_reference_instructions || ''
        });
        res.redirect('/admin/settings?success=bank_updated');
    } catch (error) {
        console.error('Save bank details error:', error);
        res.redirect('/admin/settings?error=save_failed');
    }
});

// Save shipping rates
router.post('/settings/shipping', async (req, res) => {
    try {
        await Settings.setMultiple({
            shipping_small_bag_price: req.body.shipping_small_bag_price || '',
            shipping_medium_bag_price: req.body.shipping_medium_bag_price || '',
            shipping_large_bag_price: req.body.shipping_large_bag_price || '',
            shipping_small_bag_label: req.body.shipping_small_bag_label || 'Small Bag',
            shipping_medium_bag_label: req.body.shipping_medium_bag_label || 'Medium Bag',
            shipping_large_bag_label: req.body.shipping_large_bag_label || 'Large Bag',
            shipping_pickup_available: req.body.shipping_pickup_available === 'true' ? 'true' : 'false',
            shipping_pickup_instructions: req.body.shipping_pickup_instructions || ''
        });
        res.redirect('/admin/settings?success=shipping_updated');
    } catch (error) {
        console.error('Save shipping rates error:', error);
        res.redirect('/admin/settings?error=save_failed');
    }
});

// === PLAYER MANAGEMENT ===

// Player search API (for card forms)
router.get('/api/players/search', async (req, res) => {
    try {
        const players = await Player.search(req.query.q || '', 50);
        res.json(players);
    } catch (error) {
        console.error('Player search error:', error);
        res.json([]);
    }
});

// List players
router.get('/players', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const filters = {
            search: req.query.search,
            sport: req.query.sport,
            born_in_nz: req.query.born_in_nz,
            rep_team: req.query.rep_team
        };

        const players = await Player.findAll(filters, limit, offset);
        const totalPlayers = await Player.count(filters);
        const totalPages = Math.ceil(totalPlayers / limit);

        res.render('admin/players', {
            title: 'Manage Players',
            players,
            filters,
            currentPage: page,
            totalPages,
            totalPlayers,
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS
        });
    } catch (error) {
        console.error('Players list error:', error);
        res.redirect('/admin?error=players_failed');
    }
});

// Add player form
router.get('/players/add', (req, res) => {
    res.render('admin/player-add', {
        title: 'Add Player',
        errors: [],
        formData: {},
        sportsList: Player.SPORTS_LIST,
        repTeams: Player.REP_TEAMS
    });
});

// Add player handler
router.post('/players/add', [
    body('name').trim().notEmpty().withMessage('Player name is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('admin/player-add', {
            title: 'Add Player',
            errors: errors.array(),
            formData: req.body,
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS
        });
    }

    try {
        const sportsPlayed = Array.isArray(req.body.sports_played) ? req.body.sports_played : (req.body.sports_played ? [req.body.sports_played] : []);

        await Player.create({
            name: req.body.name,
            born_in_nz: req.body.born_in_nz === 'on',
            is_female: req.body.is_female === 'on',
            sports_played: sportsPlayed,
            played_for_all_blacks: req.body.played_for_all_blacks === 'on',
            played_for_maori: req.body.played_for_maori === 'on',
            played_for_kiwis: req.body.played_for_kiwis === 'on',
            played_for_maori_rl: req.body.played_for_maori_rl === 'on',
            played_for_black_caps: req.body.played_for_black_caps === 'on',
            played_for_white_ferns: req.body.played_for_white_ferns === 'on',
            played_for_black_ferns: req.body.played_for_black_ferns === 'on',
            played_for_kiwi_ferns: req.body.played_for_kiwi_ferns === 'on',
            played_for_tall_blacks: req.body.played_for_tall_blacks === 'on',
            played_for_other: req.body.played_for_other === 'on',
            other_teams: req.body.other_teams,
            bio: req.body.bio
        });
        res.redirect('/admin/players?success=added');
    } catch (error) {
        console.error('Add player error:', error);
        res.render('admin/player-add', {
            title: 'Add Player',
            errors: [{ msg: 'Failed to add player' }],
            formData: req.body,
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS
        });
    }
});

// Edit player form
router.get('/players/:id/edit', async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).render('public/404', { title: 'Player Not Found' });

        const cards = await Player.getCards(player.id);

        res.render('admin/player-edit', {
            title: 'Edit Player',
            player,
            cards,
            errors: [],
            success: req.query.success,
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS
        });
    } catch (error) {
        console.error('Edit player error:', error);
        res.redirect('/admin/players');
    }
});

// Update player handler
router.post('/players/:id/edit', async (req, res) => {
    try {
        const sportsPlayed = Array.isArray(req.body.sports_played) ? req.body.sports_played : (req.body.sports_played ? [req.body.sports_played] : []);

        await Player.update(req.params.id, {
            name: req.body.name,
            born_in_nz: req.body.born_in_nz === 'on',
            is_female: req.body.is_female === 'on',
            sports_played: sportsPlayed,
            played_for_all_blacks: req.body.played_for_all_blacks === 'on',
            played_for_maori: req.body.played_for_maori === 'on',
            played_for_kiwis: req.body.played_for_kiwis === 'on',
            played_for_maori_rl: req.body.played_for_maori_rl === 'on',
            played_for_black_caps: req.body.played_for_black_caps === 'on',
            played_for_white_ferns: req.body.played_for_white_ferns === 'on',
            played_for_black_ferns: req.body.played_for_black_ferns === 'on',
            played_for_kiwi_ferns: req.body.played_for_kiwi_ferns === 'on',
            played_for_tall_blacks: req.body.played_for_tall_blacks === 'on',
            played_for_other: req.body.played_for_other === 'on',
            other_teams: req.body.other_teams,
            bio: req.body.bio
        });
        res.redirect(`/admin/players/${req.params.id}/edit?success=updated`);
    } catch (error) {
        console.error('Update player error:', error);
        res.redirect(`/admin/players/${req.params.id}/edit?error=update_failed`);
    }
});

// Delete player
router.post('/players/:id/delete', async (req, res) => {
    try {
        await Player.delete(req.params.id);
        res.redirect('/admin/players?success=deleted');
    } catch (error) {
        console.error('Delete player error:', error);
        res.redirect('/admin/players?error=delete_failed');
    }
});

// Link card to player
router.post('/players/:id/link', async (req, res) => {
    try {
        const cardIds = Array.isArray(req.body.card_ids) ? req.body.card_ids.map(Number) : [Number(req.body.card_ids)];
        await Player.linkCards(req.params.id, cardIds);
        res.redirect(`/admin/players/${req.params.id}/edit?success=linked`);
    } catch (error) {
        console.error('Link cards error:', error);
        res.redirect(`/admin/players/${req.params.id}/edit?error=link_failed`);
    }
});

// Unlink card from player
router.post('/players/:playerId/unlink/:cardId', async (req, res) => {
    try {
        await Player.unlinkCard(req.params.cardId);
        res.redirect(`/admin/players/${req.params.playerId}/edit?success=unlinked`);
    } catch (error) {
        console.error('Unlink card error:', error);
        res.redirect(`/admin/players/${req.params.playerId}/edit?error=unlink_failed`);
    }
});

// Player matching wizard
router.get('/players/match', async (req, res) => {
    try {
        const matches = await Player.findAllMatches();
        res.render('admin/player-match', {
            title: 'Match Players to Cards',
            matches
        });
    } catch (error) {
        console.error('Player match error:', error);
        res.redirect('/admin/players?error=match_failed');
    }
});

// Execute player match
router.post('/players/match', async (req, res) => {
    try {
        let linked = 0;
        // req.body has keys like "player_123" with array of card IDs
        for (const [key, cardIds] of Object.entries(req.body)) {
            if (key.startsWith('player_')) {
                const playerId = parseInt(key.replace('player_', ''));
                const ids = Array.isArray(cardIds) ? cardIds.map(Number) : [Number(cardIds)];
                linked += await Player.linkCards(playerId, ids);
            }
        }
        res.redirect(`/admin/players?success=matched_${linked}`);
    } catch (error) {
        console.error('Execute match error:', error);
        res.redirect('/admin/players/match?error=match_failed');
    }
});

// === PLAYER CSV IMPORT ===

router.get('/players/import', (req, res) => {
    res.render('admin/player-import', {
        title: 'Import Players',
        errors: [],
        sportsList: Player.SPORTS_LIST,
        repTeams: Player.REP_TEAMS
    });
});

router.get('/players/import/template', (req, res) => {
    const template = PlayerImport.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=player_import_template.csv');
    res.send(template.csv);
});

router.post('/players/import/upload', csvUpload.single('csv_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.render('admin/player-import', {
                title: 'Import Players',
                errors: [{ msg: 'Please select a CSV file' }],
                sportsList: Player.SPORTS_LIST,
                repTeams: Player.REP_TEAMS
            });
        }

        const parseResult = await PlayerImport.parseCSV(req.file.path);

        req.session.playerImportPreview = {
            filePath: req.file.path,
            filename: req.file.originalname,
            validRows: parseResult.results.length,
            errorRows: parseResult.errors.length,
            errors: parseResult.errors.slice(0, 10),
            sampleRows: parseResult.results.slice(0, 10),
            totalRows: parseResult.totalRows
        };

        res.render('admin/player-import-preview', {
            title: 'Player Import Preview',
            preview: req.session.playerImportPreview
        });
    } catch (error) {
        console.error('Player import upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.render('admin/player-import', {
            title: 'Import Players',
            errors: [{ msg: `Upload failed: ${error.message}` }],
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS
        });
    }
});

router.post('/players/import/execute', async (req, res) => {
    try {
        const preview = req.session.playerImportPreview;
        if (!preview || !fs.existsSync(preview.filePath)) {
            return res.redirect('/admin/players/import?error=session_expired');
        }

        const parseResult = await PlayerImport.parseCSV(preview.filePath);
        const importResult = await PlayerImport.importPlayers(parseResult.results, req.session.user.id);

        if (fs.existsSync(preview.filePath)) {
            fs.unlinkSync(preview.filePath);
        }
        delete req.session.playerImportPreview;

        res.render('admin/player-import-result', {
            title: 'Player Import Complete',
            result: importResult
        });
    } catch (error) {
        console.error('Player import execute error:', error);
        res.redirect('/admin/players/import?error=import_failed');
    }
});

// === CARD VARIATIONS ===

router.post('/cards/:id/variations/add',
    upload.single('variation_image'),
    async (req, res) => {
        try {
            const data = { ...req.body };
            if (req.file) data.image_url = `/uploads/${req.file.filename}`;
            await CardVariation.create(req.params.id, data);
            res.redirect(`/admin/cards/${req.params.id}/edit?success=variation_added`);
        } catch (error) {
            console.error('Add variation error:', error);
            res.redirect(`/admin/cards/${req.params.id}/edit?error=variation_failed`);
        }
    }
);

router.get('/cards/:cardId/variations/:varId/edit', async (req, res) => {
    try {
        const card = await Card.findById(req.params.cardId);
        const variation = await CardVariation.findById(req.params.varId);
        if (!card || !variation) return res.redirect('/admin/cards');

        res.render('admin/variation-edit', { title: 'Edit Variation', card, variation });
    } catch (error) {
        console.error('Edit variation error:', error);
        res.redirect('/admin/cards');
    }
});

router.post('/cards/:cardId/variations/:varId/edit',
    upload.single('variation_image'),
    async (req, res) => {
        try {
            const data = { ...req.body };
            if (req.file) data.image_url = `/uploads/${req.file.filename}`;
            await CardVariation.update(req.params.varId, data);
            res.redirect(`/admin/cards/${req.params.cardId}/edit?success=variation_updated`);
        } catch (error) {
            console.error('Update variation error:', error);
            res.redirect(`/admin/cards/${req.params.cardId}/edit?error=variation_failed`);
        }
    }
);

router.post('/cards/:cardId/variations/:varId/delete', async (req, res) => {
    try {
        await CardVariation.delete(req.params.varId);
        res.redirect(`/admin/cards/${req.params.cardId}/edit?success=variation_deleted`);
    } catch (error) {
        console.error('Delete variation error:', error);
        res.redirect(`/admin/cards/${req.params.cardId}/edit?error=variation_failed`);
    }
});

// Set Variations — bulk parallel management
router.get('/set-variations', async (req, res) => {
    try {
        const sets = await Card.getSets();
        const selectedSet = req.query.set_name || null;
        let baseCount = 0, insertCount = 0;

        if (selectedSet) {
            baseCount = await CardVariation.previewBulkCount(selectedSet, false);
            const totalCount = await CardVariation.previewBulkCount(selectedSet, true);
            insertCount = totalCount - baseCount;
        }

        res.render('admin/set-variations', {
            title: 'Set Variations',
            sets,
            selectedSet,
            baseCount,
            insertCount,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Set variations page error:', error);
        res.redirect('/admin/cards');
    }
});

router.post('/set-variations/bulk-add', async (req, res) => {
    try {
        const { set_name, variation_name, price_nzd, quantity, condition, sort_order, include_inserts } = req.body;
        if (!set_name || !variation_name) {
            return res.redirect('/admin/set-variations?error=missing_fields');
        }

        const result = await CardVariation.bulkCreate(
            set_name,
            { variation_name, price_nzd, quantity, condition, sort_order },
            include_inserts === '1'
        );

        res.redirect(`/admin/set-variations?set_name=${encodeURIComponent(set_name)}&success=${result.created}`);
    } catch (error) {
        console.error('Bulk add variation error:', error);
        res.redirect('/admin/set-variations?error=failed');
    }
});

// ─── Card Scanner ───────────────────────────────────────────────────────────

const scanUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/'),
        filename: (req, file, cb) => {
            const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'card-' + suffix + path.extname(file.originalname || '.jpg'));
        }
    }),
    limits: { fileSize: 25 * 1024 * 1024 }
});

router.get('/scan', async (req, res) => {
    try {
        const setsResult = await pool.query(
            `SELECT set_name, COUNT(*) as total, COUNT(image_front) as has_image
             FROM cards
             WHERE set_name IS NOT NULL AND set_name != ''
             GROUP BY set_name
             ORDER BY set_name`
        );
        res.render('admin/scan-picker', {
            title: 'Card Scanner',
            sets: setsResult.rows,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        console.error('Scan picker error:', err);
        res.redirect('/admin');
    }
});

router.get('/scan/session', async (req, res) => {
    try {
        const { set: setName, player_id } = req.query;
        if (!setName && !player_id) return res.redirect('/admin/scan');

        let cards, sessionTitle;

        if (player_id) {
            const playerRes = await pool.query('SELECT name FROM players WHERE id = $1', [player_id]);
            if (!playerRes.rows.length) return res.redirect('/admin/scan');
            sessionTitle = playerRes.rows[0].name;

            const cardsRes = await pool.query(
                `SELECT id, card_name, card_number, set_name, image_front
                 FROM cards
                 WHERE player_id = $1
                 ORDER BY set_name,
                     CASE WHEN card_number ~ '^[0-9]+$'
                          THEN LPAD(card_number, 10, '0')
                          ELSE card_number END,
                     card_name`,
                [player_id]
            );
            cards = cardsRes.rows;
        } else {
            sessionTitle = setName;
            const cardsRes = await pool.query(
                `SELECT id, card_name, card_number, set_name, image_front
                 FROM cards
                 WHERE set_name = $1
                 ORDER BY
                     CASE WHEN card_number ~ '^[0-9]+$'
                          THEN LPAD(card_number, 10, '0')
                          ELSE card_number END,
                     card_name`,
                [setName]
            );
            cards = cardsRes.rows;
        }

        res.render('admin/scan-session', {
            title: `Scan: ${sessionTitle}`,
            sessionTitle,
            showSetName: !!player_id,
            cards,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        console.error('Scan session error:', err);
        res.redirect('/admin/scan');
    }
});

router.post('/scan/upload', scanUpload.single('image'), async (req, res) => {
    try {
        const { card_id } = req.body;
        if (!card_id || !req.file) {
            return res.status(400).json({ error: 'Missing card_id or image' });
        }

        const sharp = require('sharp');
        const outputFilename = 'card-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '.jpg';
        const outputPath = path.join(__dirname, '..', 'uploads', outputFilename);

        await sharp(req.file.path)
            .resize(1400, null, { withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toFile(outputPath);

        fs.unlinkSync(req.file.path);

        const imagePath = `/uploads/${outputFilename}`;
        await pool.query(
            'UPDATE cards SET image_front = $1 WHERE id = $2',
            [imagePath, card_id]
        );

        res.json({ success: true, image_path: imagePath });
    } catch (err) {
        console.error('Scan upload error:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

router.post('/scan/delete-image', async (req, res) => {
    try {
        const { card_id } = req.body;
        if (!card_id) return res.status(400).json({ error: 'Missing card_id' });

        const result = await pool.query('SELECT image_front FROM cards WHERE id = $1', [card_id]);
        if (result.rows.length && result.rows[0].image_front) {
            const imgPath = result.rows[0].image_front;
            if (imgPath.startsWith('/uploads/')) {
                try { fs.unlinkSync(path.join(__dirname, '..', imgPath)); } catch (_) {}
            }
        }

        await pool.query('UPDATE cards SET image_front = NULL WHERE id = $1', [card_id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete image error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Tickets ────────────────────────────────────────────────────────────────

router.get('/tickets', async (req, res) => {
    try {
        const { status } = req.query;
        const tickets = await Ticket.getAll(status ? { status } : {});
        const counts = await Ticket.countByStatus();
        res.render('admin/tickets', {
            title: 'Tickets',
            tickets,
            counts,
            filterStatus: status || '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        console.error('Tickets list error:', err);
        res.redirect('/admin?error=tickets_failed');
    }
});

router.get('/tickets/:id', async (req, res) => {
    try {
        const ticket = await Ticket.getById(req.params.id);
        if (!ticket) return res.redirect('/admin/tickets?error=not_found');
        res.render('admin/ticket-detail', {
            title: `Ticket #${ticket.id}`,
            ticket,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        console.error('Ticket detail error:', err);
        res.redirect('/admin/tickets');
    }
});

router.post('/tickets', async (req, res) => {
    try {
        const { title, description, screenshot, page_url, page_title } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        let screenshot_path = null;
        if (screenshot && screenshot.startsWith('data:image/')) {
            const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
            const filename = `ticket-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
            const filepath = path.join(__dirname, '..', 'uploads', 'tickets', filename);
            fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
            screenshot_path = `tickets/${filename}`;
        }

        const ticket = await Ticket.create({
            title,
            description,
            screenshot_path,
            page_url,
            page_title,
            created_by: req.session.user ? req.session.user.id : null
        });

        res.json({ id: ticket.id });
    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

router.post('/tickets/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['open', 'in_progress', 'resolved'];
        if (!valid.includes(status)) return res.redirect(`/admin/tickets/${req.params.id}?error=invalid_status`);
        await Ticket.updateStatus(req.params.id, status);
        res.redirect(`/admin/tickets/${req.params.id}?success=status_updated`);
    } catch (err) {
        console.error('Update ticket status error:', err);
        res.redirect(`/admin/tickets/${req.params.id}?error=update_failed`);
    }
});

router.post('/tickets/:id/notes', async (req, res) => {
    try {
        await Ticket.updateNotes(req.params.id, req.body.notes || '');
        res.redirect(`/admin/tickets/${req.params.id}?success=notes_saved`);
    } catch (err) {
        console.error('Update ticket notes error:', err);
        res.redirect(`/admin/tickets/${req.params.id}?error=notes_failed`);
    }
});

// ── Pending Cards Queue ──────────────────────────────────────────────────────

router.get('/pending-cards', async (req, res) => {
    try {
        const pendingCards = await PendingCard.findAll();
        res.render('admin/pending-cards', {
            title: 'Pending Card Submissions',
            pendingCards,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error('Pending cards list error:', err);
        res.redirect('/admin/dashboard');
    }
});

router.get('/pending-cards/:id/edit', async (req, res) => {
    try {
        const card = await PendingCard.findById(req.params.id);
        if (!card) return res.redirect('/admin/pending-cards?error=not_found');
        res.render('admin/pending-card-edit', {
            title: 'Edit Pending Card',
            card,
            errors: [],
            success: req.query.success
        });
    } catch (err) {
        console.error('Pending card edit error:', err);
        res.redirect('/admin/pending-cards');
    }
});

router.post('/pending-cards/:id/edit', async (req, res) => {
    try {
        await PendingCard.update(req.params.id, req.body);
        res.redirect(`/admin/pending-cards/${req.params.id}/edit?success=saved`);
    } catch (err) {
        console.error('Pending card update error:', err);
        res.redirect(`/admin/pending-cards/${req.params.id}/edit?error=save_failed`);
    }
});

router.post('/pending-cards/:id/promote', async (req, res) => {
    try {
        const newCardId = await PendingCard.promote(req.params.id, {
            condition: req.body.condition || null,
            price_nzd: req.body.price_nzd || null,
            quantity: req.body.quantity || 1,
            description: req.body.description || null,
            available: req.body.available !== 'false'
        });
        res.redirect(`/admin/cards/${newCardId}/edit?success=promoted`);
    } catch (err) {
        console.error('Pending card promote error:', err);
        res.redirect(`/admin/pending-cards/${req.params.id}/edit?error=promote_failed`);
    }
});

router.post('/pending-cards/:id/delete', async (req, res) => {
    try {
        await PendingCard.delete(req.params.id);
        res.redirect('/admin/pending-cards?success=deleted');
    } catch (err) {
        console.error('Pending card delete error:', err);
        res.redirect('/admin/pending-cards?error=delete_failed');
    }
});

module.exports = router;
