const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const { helmetConfig, csrfProtection } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security and performance middleware
app.use(helmetConfig);
app.use(compression());

// Logging (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// CSRF protection
app.use(csrfProtection);

// Make user and query params available to all templates
app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    res.locals.isSocietyMember = req.session.user && req.session.user.is_society_member === true;
    res.locals.success = req.query.success || req.query.inquiry || null;
    res.locals.cartCount = 0;
    if (req.session.user) {
        try {
            const Cart = require('./models/Cart');
            const cartItems = await Cart.getByUser(req.session.user.id);
            res.locals.cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        } catch (e) { /* ignore */ }
    }
    next();
});

// Routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/api/v1', apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('public/404', {
        title: 'Page Not Found',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: res.locals.user || null,
        isAdmin: res.locals.isAdmin || false
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('public/error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        user: res.locals.user || null,
        isAdmin: res.locals.isAdmin || false
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Visit: http://localhost:${PORT}`);
    console.log(`✓ Network access enabled on all interfaces`);
});

module.exports = app;
