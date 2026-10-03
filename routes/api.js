const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { requireApiAuth, requireApiAdmin } = require('../middleware/apiAuth');
const Card = require('../models/Card');
const Order = require('../models/Order');
const Accessory = require('../models/Accessory');
const Set = require('../models/Set');

// Multer storage for API-uploaded card images (temp location; resized copy
// is written to uploads/ and the temp upload is removed - see POST
// /cards/:id/images below)
const cardImageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/'),
        filename: (req, file, cb) => {
            const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'tmp-' + suffix + path.extname(file.originalname || '.jpg'));
        }
    }),
    limits: { fileSize: 25 * 1024 * 1024 }
});

/**
 * @api {get} /api/v1/cards Get all cards
 * @apiName GetCards
 * @apiGroup Cards
 * @apiVersion 1.0.0
 *
 * @apiDescription Retrieve a list of all available cards with pagination and filtering
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=50] Number of items per page (max 100)
 * @apiParam {String} [search] Search term for card name
 * @apiParam {String} [sport_type] Filter by sport type
 * @apiParam {String} [manufacturer] Filter by manufacturer
 * @apiParam {Number} [year] Filter by year
 * @apiParam {String} [condition] Filter by condition
 * @apiParam {Boolean} [available=true] Show only available cards
 *
 * @apiSuccess {Object[]} cards List of cards
 * @apiSuccess {Object} pagination Pagination information
 * @apiSuccess {Number} pagination.page Current page
 * @apiSuccess {Number} pagination.limit Items per page
 * @apiSuccess {Number} pagination.total Total items
 * @apiSuccess {Number} pagination.pages Total pages
 *
 * @apiSuccessExample Success Response:
 * {
 *   "cards": [...],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 50,
 *     "total": 150,
 *     "pages": 3
 *   }
 * }
 */
router.get('/cards', requireApiAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            sport_type: req.query.sport_type,
            manufacturer: req.query.manufacturer,
            year: req.query.year,
            condition: req.query.condition
        };

        const includeUnavailable = req.apiUser.role === 'admin';
        const cards = await Card.findAll(filters, limit, offset, includeUnavailable);
        const total = await Card.count(filters, includeUnavailable);

        res.json({
            cards,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('API Get cards error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {get} /api/v1/cards/:id Get card by ID
 * @apiName GetCard
 * @apiGroup Cards
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Card ID
 *
 * @apiSuccess {Object} card Card object
 */
router.get('/cards/:id', requireApiAuth, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
        }

        res.json({ card });
    } catch (error) {
        console.error('API Get card error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {post} /api/v1/cards Create a new card
 * @apiName CreateCard
 * @apiGroup Cards
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {String} card_name Card name (required)
 * @apiParam {String} [set_name] Set name
 * @apiParam {String} [card_number] Card number
 * @apiParam {String} [manufacturer] Manufacturer
 * @apiParam {String} [insert_list] Insert/subset name
 * @apiParam {Number} [year] Year
 * @apiParam {String} [card_category] Category (sport/non_sport)
 * @apiParam {String} [sport_type] Sport type
 * @apiParam {String} [condition] Condition
 * @apiParam {Number} price_nzd Price in NZD (required)
 * @apiParam {Number} [quantity=1] Quantity
 * @apiParam {String} [image_front] Front image URL
 * @apiParam {String} [image_back] Back image URL
 * @apiParam {String} [description] Description
 * @apiParam {Boolean} [available=true] Availability status
 *
 * @apiSuccess {Object} card Created card object
 */
router.post('/cards', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const { card_name, price_nzd, quantity } = req.body;

        if (!card_name || price_nzd === undefined || price_nzd === null || price_nzd === '') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'card_name and price_nzd are required'
            });
        }

        const card = await Card.create(req.body);
        res.status(201).json({ card });
    } catch (error) {
        console.error('API Create card error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {put} /api/v1/cards/:id Update a card
 * @apiName UpdateCard
 * @apiGroup Cards
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Card ID
 * @apiParam {String} [card_name] Card name
 * @apiParam {String} [set_name] Set name
 * @apiParam {Number} [price_nzd] Price in NZD
 * @apiParam {Number} [quantity] Quantity
 * @apiParam {Boolean} [available] Availability status
 *
 * @apiSuccess {Object} card Updated card object
 */
router.put('/cards/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
        }

        const updatedCard = await Card.update(req.params.id, req.body);
        res.json({ card: updatedCard });
    } catch (error) {
        console.error('API Update card error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {delete} /api/v1/cards/:id Delete a card
 * @apiName DeleteCard
 * @apiGroup Cards
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Card ID
 *
 * @apiSuccess {String} message Success message
 */
router.delete('/cards/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
        }

        await Card.delete(req.params.id);
        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        console.error('API Delete card error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {post} /api/v1/cards/:id/images Upload front/back images for a card
 * @apiName UploadCardImages
 * @apiGroup Cards
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Card ID
 * @apiParam {File} [front] Front image file (multipart/form-data)
 * @apiParam {File} [back] Back image file (multipart/form-data)
 *
 * @apiSuccess {Object} card Object with updated image_front/image_back URLs
 */
router.post('/cards/:id/images',
    requireApiAuth,
    requireApiAdmin,
    cardImageUpload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }]),
    async (req, res) => {
        const cleanupTemp = () => {
            for (const side of ['front', 'back']) {
                const file = req.files?.[side]?.[0];
                if (file) { try { fs.unlinkSync(file.path); } catch (_) {} }
            }
        };

        try {
            const card = await Card.findById(req.params.id);
            if (!card) {
                cleanupTemp();
                return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
            }

            if (!req.files?.front && !req.files?.back) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'At least one of "front" or "back" image files is required'
                });
            }

            const updates = {};

            for (const side of ['front', 'back']) {
                const file = req.files?.[side]?.[0];
                if (!file) continue;

                const outputFilename = 'card-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '.jpg';
                const outputPath = path.join(__dirname, '..', 'uploads', outputFilename);

                await sharp(file.path)
                    .resize(1400, null, { withoutEnlargement: true })
                    .jpeg({ quality: 88 })
                    .toFile(outputPath);

                fs.unlinkSync(file.path);

                updates[side === 'front' ? 'image_front' : 'image_back'] = `/uploads/${outputFilename}`;
            }

            const updatedCard = await Card.update(req.params.id, updates);
            res.json({ card: updatedCard });
        } catch (error) {
            cleanupTemp();
            console.error('API Upload card images error:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
);

// ===========================
// ORDERS ENDPOINTS
// ===========================

/**
 * @api {get} /api/v1/orders Get all orders
 * @apiName GetOrders
 * @apiGroup Orders
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {String} [status] Filter by status (pending/processing/shipped/delivered/cancelled)
 * @apiParam {String} [search] Search by order number or customer email
 * @apiParam {Number} [page=1] Page number
 * @apiParam {Number} [limit=50] Items per page
 *
 * @apiSuccess {Object[]} orders List of orders
 * @apiSuccess {Object} pagination Pagination information
 */
router.get('/orders', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };

        const orders = await Order.findAll(filters);
        res.json({ orders });
    } catch (error) {
        console.error('API Get orders error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {get} /api/v1/orders/:id Get order by ID
 * @apiName GetOrder
 * @apiGroup Orders
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Order ID
 *
 * @apiSuccess {Object} order Order object with items
 */
router.get('/orders/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        const orderItems = await Order.getItems(order.id);
        res.json({ order: { ...order, items: orderItems } });
    } catch (error) {
        console.error('API Get order error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {put} /api/v1/orders/:id/status Update order status
 * @apiName UpdateOrderStatus
 * @apiGroup Orders
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Order ID
 * @apiParam {String} status New status (pending/processing/shipped/delivered/cancelled)
 *
 * @apiSuccess {Object} order Updated order object
 */
router.put('/orders/:id/status', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Bad Request', message: 'Status is required' });
        }

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        await Order.updateStatus(req.params.id, status);
        const order = await Order.findById(req.params.id);
        res.json({ order });
    } catch (error) {
        console.error('API Update order status error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// ===========================
// ACCESSORIES ENDPOINTS
// ===========================

/**
 * @api {get} /api/v1/accessories Get all accessories
 * @apiName GetAccessories
 * @apiGroup Accessories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} [page=1] Page number
 * @apiParam {Number} [limit=50] Items per page (max 100)
 * @apiParam {String} [search] Search term
 * @apiParam {String} [category] Filter by category
 *
 * @apiSuccess {Object[]} accessories List of accessories
 * @apiSuccess {Object} pagination Pagination information
 */
router.get('/accessories', requireApiAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            category: req.query.category
        };

        const includeUnavailable = req.apiUser.role === 'admin';
        const accessories = await Accessory.findAll(filters, limit, offset, includeUnavailable);
        const total = await Accessory.count(filters, includeUnavailable);

        res.json({
            accessories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('API Get accessories error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {get} /api/v1/accessories/:id Get accessory by ID
 * @apiName GetAccessory
 * @apiGroup Accessories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Accessory ID
 *
 * @apiSuccess {Object} accessory Accessory object
 */
router.get('/accessories/:id', requireApiAuth, async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);

        if (!accessory) {
            return res.status(404).json({ error: 'Not Found', message: 'Accessory not found' });
        }

        res.json({ accessory });
    } catch (error) {
        console.error('API Get accessory error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {post} /api/v1/accessories Create a new accessory
 * @apiName CreateAccessory
 * @apiGroup Accessories
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {String} product_name Product name (required)
 * @apiParam {String} [category] Category
 * @apiParam {String} [description] Description
 * @apiParam {Number} price_nzd Price in NZD (required)
 * @apiParam {Number} [quantity=0] Quantity
 * @apiParam {String} [manufacturer] Manufacturer
 * @apiParam {String} [image_url] Image URL
 *
 * @apiSuccess {Object} accessory Created accessory object
 */
router.post('/accessories', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const { product_name, price_nzd } = req.body;

        if (!product_name || !price_nzd) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'product_name and price_nzd are required'
            });
        }

        const accessory = await Accessory.create(req.body);
        res.status(201).json({ accessory });
    } catch (error) {
        console.error('API Create accessory error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {put} /api/v1/accessories/:id Update an accessory
 * @apiName UpdateAccessory
 * @apiGroup Accessories
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Accessory ID
 *
 * @apiSuccess {Object} accessory Updated accessory object
 */
router.put('/accessories/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);

        if (!accessory) {
            return res.status(404).json({ error: 'Not Found', message: 'Accessory not found' });
        }

        const updatedAccessory = await Accessory.update(req.params.id, req.body);
        res.json({ accessory: updatedAccessory });
    } catch (error) {
        console.error('API Update accessory error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {delete} /api/v1/accessories/:id Delete an accessory
 * @apiName DeleteAccessory
 * @apiGroup Accessories
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Accessory ID
 *
 * @apiSuccess {String} message Success message
 */
router.delete('/accessories/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);

        if (!accessory) {
            return res.status(404).json({ error: 'Not Found', message: 'Accessory not found' });
        }

        await Accessory.delete(req.params.id);
        res.json({ message: 'Accessory deleted successfully' });
    } catch (error) {
        console.error('API Delete accessory error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// ===========================
// SETS ENDPOINTS
// ===========================

/**
 * @api {get} /api/v1/sets Get all sets
 * @apiName GetSets
 * @apiGroup Sets
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} [page=1] Page number
 * @apiParam {Number} [limit=50] Items per page (max 100)
 * @apiParam {String} [search] Search term
 * @apiParam {String} [sport_type] Filter by sport type
 * @apiParam {String} [manufacturer] Filter by manufacturer
 *
 * @apiSuccess {Object[]} sets List of sets
 * @apiSuccess {Object} pagination Pagination information
 */
router.get('/sets', requireApiAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            sport_type: req.query.sport_type,
            manufacturer: req.query.manufacturer
        };

        const sets = await Set.findAll(filters, limit, offset);
        const total = await Set.count(filters);

        res.json({
            sets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('API Get sets error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {get} /api/v1/sets/:id Get set by ID
 * @apiName GetSet
 * @apiGroup Sets
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Set ID
 *
 * @apiSuccess {Object} set Set object
 */
router.get('/sets/:id', requireApiAuth, async (req, res) => {
    try {
        const set = await Set.findById(req.params.id);

        if (!set) {
            return res.status(404).json({ error: 'Not Found', message: 'Set not found' });
        }

        res.json({ set });
    } catch (error) {
        console.error('API Get set error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {post} /api/v1/sets Create a new set
 * @apiName CreateSet
 * @apiGroup Sets
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {String} set_name Set name (required)
 * @apiParam {String} [manufacturer] Manufacturer
 * @apiParam {Number} [year] Year
 * @apiParam {String} [sport_type] Sport type
 * @apiParam {String} [card_category] Card category
 * @apiParam {String} [description] Description
 * @apiParam {String} [image_url] Image URL
 *
 * @apiSuccess {Object} set Created set object
 */
router.post('/sets', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const { set_name } = req.body;

        if (!set_name) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'set_name is required'
            });
        }

        const set = await Set.create(req.body);
        res.status(201).json({ set });
    } catch (error) {
        console.error('API Create set error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {put} /api/v1/sets/:id Update a set
 * @apiName UpdateSet
 * @apiGroup Sets
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Set ID
 *
 * @apiSuccess {Object} set Updated set object
 */
router.put('/sets/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const set = await Set.findById(req.params.id);

        if (!set) {
            return res.status(404).json({ error: 'Not Found', message: 'Set not found' });
        }

        const updatedSet = await Set.update(req.params.id, req.body);
        res.json({ set: updatedSet });
    } catch (error) {
        console.error('API Update set error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * @api {delete} /api/v1/sets/:id Delete a set
 * @apiName DeleteSet
 * @apiGroup Sets
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiHeader {String} Authorization Basic Auth credentials (username:api_key)
 *
 * @apiParam {Number} id Set ID
 *
 * @apiSuccess {String} message Success message
 */
router.delete('/sets/:id', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const set = await Set.findById(req.params.id);

        if (!set) {
            return res.status(404).json({ error: 'Not Found', message: 'Set not found' });
        }

        await Set.delete(req.params.id);
        res.json({ message: 'Set deleted successfully' });
    } catch (error) {
        console.error('API Delete set error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

module.exports = router;
