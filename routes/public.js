const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const CardImage = require('../models/CardImage');
const Accessory = require('../models/Accessory');
const Figurine = require('../models/Figurine');
const Inquiry = require('../models/Inquiry');
const Player = require('../models/Player');
const SetModel = require('../models/Set');
const Collection = require('../models/Collection');
const CardVariation = require('../models/CardVariation');

// Homepage
router.get('/', async (req, res) => {
    try {
        const featuredAccessories = await Accessory.getRandom(6);
        const categories = await Accessory.getCategories();
        const figurines = await Figurine.findAll(true, 6, 0);
        const featuredPlayers = await Player.getFeatured(8);

        res.render('public/home', {
            title: 'Truly Collectables - Card Accessories & Supplies',
            featuredAccessories,
            categories,
            figurines,
            featuredPlayers
        });
    } catch (error) {
        console.error('Homepage error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load homepage'
        });
    }
});

// Site-wide search
router.get('/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.redirect('/');

    try {
        const [cards, accessories, figurines] = await Promise.all([
            Card.search(q),
            Accessory.findAll({ search: q }, 8, 0),
            Figurine.search(q)
        ]);

        res.render('public/search', {
            title: `Search: ${q}`,
            q,
            cards,
            accessories,
            figurines
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('public/error', { title: 'Error', message: 'Search failed' });
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
            manufacturer: req.query.manufacturer,
            set_name: req.query.set_name,
            year: req.query.year,
            condition: req.query.condition,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            search: req.query.search,
            sort: req.query.sort || 'created_at',
            order: req.query.order || 'desc'
        };

        // Get navigation tree for sidebar
        const navigationTree = await Card.getNavigationTree();

        const cards = await Card.findAll(filters, limit, offset);
        const totalCards = await Card.count(filters);
        const totalPages = Math.ceil(totalCards / limit);

        const sportTypes = await Card.getSportTypes();
        const sets = await Card.getSets();

        let collectionCardIds = new Set();
        if (req.session.user && cards.length > 0) {
            const userCollection = await Collection.findByUser(req.session.user.id, 'have');
            userCollection.forEach(item => { if (item.card_id) collectionCardIds.add(item.card_id); });
        }

        res.render('public/cards', {
            title: 'Browse Cards',
            cards,
            filters,
            sportTypes,
            sets,
            navigationTree,
            currentPage: page,
            totalPages,
            totalCards,
            collectionCardIds: [...collectionCardIds]
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

        // Get linked player if any
        let player = null;
        if (card.player_id) {
            player = await Player.findById(card.player_id);
        }

        let inCollection = false;
        let wantCollection = false;
        if (req.session.user) {
            inCollection = !!(await Collection.hasCard(req.session.user.id, card.id, 'have'));
            wantCollection = !!(await Collection.hasCard(req.session.user.id, card.id, 'want'));
        }

        const cardStats = await Collection.getCardStats(card.id);
        const variations = await CardVariation.getByCardId(card.id);

        res.render('public/card-detail', {
            title: `${card.card_name} - ${card.set_name || 'Card'}`,
            card,
            additionalImages,
            player,
            inCollection,
            wantCollection,
            cardStats,
            variations
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

        const pool = require('../config/database');
        const [imgResult, collectionStatus] = await Promise.all([
            pool.query('SELECT * FROM figurine_images WHERE figurine_id = $1 ORDER BY display_order', [figurine.id]),
            req.session.user
                ? pool.query(
                    'SELECT status FROM user_collections WHERE user_id = $1 AND figurine_id = $2',
                    [req.session.user.id, figurine.id]
                  )
                : Promise.resolve({ rows: [] }),
        ]);

        const userHas = collectionStatus.rows.some(r => r.status === 'have');
        const userWants = collectionStatus.rows.some(r => r.status === 'want');

        res.render('public/figurine-detail', {
            title: figurine.product_name,
            figurine,
            images: imgResult.rows,
            userHas,
            userWants,
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
            category: req.query.category || null,
            search: req.query.search || null,
            min_price: req.query.min_price && req.query.min_price !== 'undefined' ? req.query.min_price : null,
            max_price: req.query.max_price && req.query.max_price !== 'undefined' ? req.query.max_price : null,
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

// Accessory detail page
router.get('/accessories/:id', async (req, res) => {
    try {
        const accessory = await Accessory.findById(req.params.id);

        if (!accessory) {
            return res.status(404).render('public/404', {
                title: 'Accessory Not Found'
            });
        }

        // Parse variants if stored as string
        if (accessory.variants && typeof accessory.variants === 'string') {
            accessory.variants = JSON.parse(accessory.variants);
        }

        res.render('public/accessory-detail', {
            title: accessory.product_name,
            accessory
        });
    } catch (error) {
        console.error('Accessory detail error:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'Unable to load accessory details'
        });
    }
});

// Sport Cards (singles, category=sport)
router.get('/sport-cards', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            card_category: 'sport',
            product_type: 'single',
            sport_type: req.query.sport_type,
            manufacturer: req.query.manufacturer,
            set_name: req.query.set_name,
            year: req.query.year,
            team: req.query.team,
            condition: req.query.condition,
            search: req.query.search,
            sort: req.query.sort || (req.query.set_name ? 'card_number' : 'created_at'),
            order: req.query.order || 'asc'
        };

        const cards = await Card.findAll(filters, limit, offset);
        const totalCards = await Card.count(filters);
        const totalPages = Math.ceil(totalCards / limit);
        const sportTypes = await Card.getSportTypes('sport');
        const teams = await Card.getTeams();
        const navigationTree = await Card.getNavigationTree();

        res.render('public/sport-cards', {
            title: 'Sport Cards',
            cards, filters, sportTypes, teams, navigationTree,
            currentPage: page, totalPages, totalCards
        });
    } catch (error) {
        console.error('Sport cards error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load sport cards' });
    }
});

// Sport Sets
router.get('/sport-sets', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const filters = {
            sport_type: req.query.sport_type,
            manufacturer: req.query.manufacturer,
            search: req.query.search
        };

        const sets = await SetModel.findAll({ ...filters, card_category: 'sport' }, limit, offset);
        const totalSets = await SetModel.count({ ...filters, card_category: 'sport' });
        const totalPages = Math.ceil(totalSets / limit);
        const sportTypes = await Card.getSportTypes('sport');
        const manufacturers = await SetModel.getManufacturers();

        res.render('public/sport-sets', {
            title: 'Sport Sets',
            sets, filters, sportTypes, manufacturers,
            currentPage: page, totalPages, totalSets
        });
    } catch (error) {
        console.error('Sport sets error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load sport sets' });
    }
});

// Boxes & Packs
router.get('/boxes-packs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            sport_type: req.query.sport_type,
            set_name: req.query.set_name,
            search: req.query.search,
            sort: req.query.sort || 'created_at',
            order: req.query.order || 'desc'
        };

        // Get both boxes and packs
        const boxFilters = { ...filters, product_type: 'box' };
        const packFilters = { ...filters, product_type: 'pack' };

        const boxes = await Card.findAll(boxFilters, limit, offset);
        const packs = await Card.findAll(packFilters, limit, offset);
        const totalBoxes = await Card.count(boxFilters);
        const totalPacks = await Card.count(packFilters);

        // Combined view
        const allFilters = { ...filters };
        // Use a custom query approach - get both types
        const combinedFilters = { ...filters };
        delete combinedFilters.product_type;

        const sportTypes = await Card.getSportTypes();

        res.render('public/boxes-packs', {
            title: 'Boxes & Packs',
            boxes, packs, filters, sportTypes,
            totalBoxes, totalPacks,
            currentPage: page
        });
    } catch (error) {
        console.error('Boxes/packs error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load boxes & packs' });
    }
});

// Non-Sport
router.get('/non-sport', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const filters = {
            card_category: 'non_sport',
            sport_type: req.query.sport_type,
            set_name: req.query.set_name,
            search: req.query.search,
            sort: req.query.sort || 'created_at',
            order: req.query.order || 'desc'
        };

        const cards = await Card.findAll(filters, limit, offset);
        const totalCards = await Card.count(filters);
        const totalPages = Math.ceil(totalCards / limit);
        const sportTypes = await Card.getSportTypes('non_sport');
        const navigationTree = await Card.getNavigationTree();

        res.render('public/non-sport', {
            title: 'Non-Sport Cards',
            cards, filters, sportTypes, navigationTree,
            currentPage: page, totalPages, totalCards
        });
    } catch (error) {
        console.error('Non-sport error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load non-sport cards' });
    }
});

// Players listing
router.get('/players', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            sport: req.query.sport,
            rep_team: req.query.rep_team
        };

        const players = await Player.findAll(filters, limit, offset);
        const totalPlayers = await Player.count(filters);
        const totalPages = Math.ceil(totalPlayers / limit);

        res.render('public/players', {
            title: 'Players',
            players, filters,
            sportsList: Player.SPORTS_LIST,
            repTeams: Player.REP_TEAMS,
            currentPage: page, totalPages, totalPlayers
        });
    } catch (error) {
        console.error('Players error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load players' });
    }
});

// Player detail
router.get('/players/:id', async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) {
            return res.status(404).render('public/404', { title: 'Player Not Found' });
        }

        const cards = await Player.getCards(player.id);

        res.render('public/player-detail', {
            title: player.name,
            player, cards
        });
    } catch (error) {
        console.error('Player detail error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load player' });
    }
});

// Team view
router.get('/team/:team', async (req, res) => {
    try {
        const teamName = req.params.team;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const cards = await Card.findAll({ team: teamName }, limit, offset);
        const totalCards = await Card.count({ team: teamName });
        const totalPages = Math.ceil(totalCards / limit);

        res.render('public/team', {
            title: `${teamName} Cards`,
            teamName, cards,
            currentPage: page, totalPages, totalCards
        });
    } catch (error) {
        console.error('Team view error:', error);
        res.render('public/error', { title: 'Error', message: 'Unable to load team cards' });
    }
});

module.exports = router;
