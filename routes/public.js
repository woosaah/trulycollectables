const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const CardImage = require('../models/CardImage');
const Accessory = require('../models/Accessory');
const Figurine = require('../models/Figurine');
const Inquiry = require('../models/Inquiry');

// Homepage
router.get('/', async (req, res) => {
    try {
        const featuredCards = await Card.getFeatured(6);
        const sportTypes = await Card.getSportTypes();

        res.render('public/home', {
            title: 'Truly Collectables - Trading Cards & Figurines',
            featuredCards,
            sportTypes
        });
    } catch (error) {
        console.error('Homepage error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load homepage'
        });
    }
});

// Browse cards
router.get('/cards', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            sport_type: req.query.sport_type,
            set_name: req.query.set_name,
            year: req.query.year,
            condition: req.query.condition,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            search: req.query.search,
            sort: req.query.sort || 'created_at',
            order: req.query.order || 'desc'
        };

        const cards = await Card.findAll(filters, limit, offset);
        const totalCards = await Card.count(filters);
        const totalPages = Math.ceil(totalCards / limit);

        const sportTypes = await Card.getSportTypes();
        const sets = await Card.getSets();

        res.render('public/cards', {
            title: 'Browse Cards',
            cards,
            filters,
            sportTypes,
            sets,
            currentPage: page,
            totalPages,
            totalCards
        });
    } catch (error) {
        console.error('Browse cards error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load cards'
        });
    }
});

// Card detail page
router.get('/cards/:id', async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).render('public/404', {
                title: 'Card Not Found'
            });
        }

        // Get additional images for gallery
        const additionalImages = await CardImage.getByCardId(req.params.id);

        res.render('public/card-detail', {
            title: `${card.card_name} - ${card.set_name || 'Card'}`,
            card,
            additionalImages
        });
    } catch (error) {
        console.error('Card detail error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load card details'
        });
    }
});

// Browse figurines
router.get('/figurines', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const figurines = await Figurine.findAll(true, limit, offset);
        const totalFigurines = await Figurine.count(true);
        const totalPages = Math.ceil(totalFigurines / limit);

        res.render('public/figurines', {
            title: 'Browse Figurines',
            figurines,
            currentPage: page,
            totalPages,
            totalFigurines
        });
    } catch (error) {
        console.error('Browse figurines error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load figurines'
        });
    }
});

// Figurine detail page
router.get('/figurines/:id', async (req, res) => {
    try {
        const figurine = await Figurine.findById(req.params.id);

        if (!figurine || !figurine.approved) {
            return res.status(404).render('public/404', {
                title: 'Figurine Not Found'
            });
        }

        res.render('public/figurine-detail', {
            title: figurine.product_name,
            figurine
        });
    } catch (error) {
        console.error('Figurine detail error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load figurine details'
        });
    }
});

// Submit inquiry (requires login)
router.post('/inquiries', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    try {
        const { card_id, message } = req.body;
        await Inquiry.create(req.session.user.id, card_id, message);

        res.redirect(`/cards/${card_id}?inquiry=success`);
    } catch (error) {
        console.error('Inquiry submission error:', error);
        res.redirect('back');
    }
});

// Browse accessories
router.get('/accessories', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            category: req.query.category,
            search: req.query.search,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            sort: req.query.sort || 'created_at',
            order: req.query.order || 'desc'
        };

        const accessories = await Accessory.findAll(filters, limit, offset);
        const totalAccessories = await Accessory.count(filters);
        const totalPages = Math.ceil(totalAccessories / limit);

        const categories = await Accessory.getCategories();

        res.render('public/accessories', {
            title: 'Card Accessories - Pages, Albums, Sleeves & More',
            accessories,
            categories,
            filters,
            currentPage: page,
            totalPages,
            totalAccessories
        });
    } catch (error) {
        console.error('Accessories browse error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load accessories'
        });
    }
});

module.exports = router;
