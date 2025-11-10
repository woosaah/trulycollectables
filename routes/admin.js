const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Card = require('../models/Card');
const CardImage = require('../models/CardImage');
const Figurine = require('../models/Figurine');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const CsvImport = require('../models/CsvImport');
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

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            pendingOrdersCount: pendingOrders.length,
            pendingFigurinesCount: pendingFigurines.length,
            newInquiriesCount: newInquiries.length
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load dashboard'
        });
    }
});

// === CARD INVENTORY MANAGEMENT ===

// List all cards
router.get('/cards', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            sport_type: req.query.sport_type
        };

        const cards = await Card.findAll(filters, limit, offset);
        const totalCards = await Card.count(filters);
        const totalPages = Math.ceil(totalCards / limit);
        const sportTypes = await Card.getSportTypes();

        res.render('admin/cards', {
            title: 'Manage Cards',
            cards,
            filters,
            sportTypes,
            currentPage: page,
            totalPages
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

            await Card.create(cardData);
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

        // Get additional images
        const additionalImages = await CardImage.getByCardId(req.params.id);

        res.render('admin/card-edit', {
            title: 'Edit Card',
            card,
            additionalImages,
            errors: [],
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Edit card error:', error);
        res.redirect('/admin/cards');
    }
});

// Update card handler
router.post('/cards/:id/edit',
    upload.fields([{ name: 'image_front', maxCount: 1 }, { name: 'image_back', maxCount: 1 }]),
    async (req, res) => {
        try {
            const updates = { ...req.body };

            if (req.files?.image_front) {
                updates.image_front = `/uploads/${req.files.image_front[0].filename}`;
            }

            if (req.files?.image_back) {
                updates.image_back = `/uploads/${req.files.image_back[0].filename}`;
            }

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

// Toggle card availability
router.post('/cards/:id/toggle-availability', async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        await Card.update(req.params.id, { available: !card.available });
        res.redirect('back');
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

        res.render('admin/order-detail', {
            title: `Order #${order.order_number}`,
            order,
            orderItems
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
        res.redirect(`/admin/orders/${req.params.id}?success=updated`);
    } catch (error) {
        console.error('Update order status error:', error);
        res.redirect('/admin/orders');
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
    res.render('admin/csv-import', {
        title: 'Bulk CSV Import',
        errors: []
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
            year: req.body.col_year || 'year',
            sport_type: req.body.col_sport_type || 'sport_type',
            player_name: req.body.col_player_name || 'player_name',
            condition: req.body.col_condition || 'condition',
            price_nzd: req.body.col_price_nzd || 'price_nzd',
            quantity: req.body.col_quantity || 'quantity',
            rarity: req.body.col_rarity || 'rarity',
            description: req.body.col_description || 'description'
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

module.exports = router;
