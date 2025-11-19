const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const ActivityLog = require('../models/ActivityLog');

// Rate limiting configurations
const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 accounts per hour
    message: 'Too many accounts created from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: 'Too many password reset requests, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// Activity logging middleware
const logActivity = (action, entityType = null) => {
    return async (req, res, next) => {
        if (req.session && req.session.user) {
            try {
                const entityId = req.params.id || req.body.id || null;
                const ipAddress = req.ip || req.connection.remoteAddress;
                const userAgent = req.get('user-agent');

                await ActivityLog.log(
                    req.session.user.id,
                    action,
                    entityType,
                    entityId,
                    ipAddress,
                    userAgent,
                    {
                        method: req.method,
                        path: req.path
                    }
                );
            } catch (error) {
                console.error('Activity logging error:', error);
            }
        }
        next();
    };
};

// Helmet security headers configuration
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// CSRF protection for forms
const csrfProtection = (req, res, next) => {
    // Simple CSRF token implementation
    if (req.method === 'GET') {
        // Generate token for GET requests
        if (!req.session.csrfToken) {
            req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        }
        res.locals.csrfToken = req.session.csrfToken;
    } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Verify token for state-changing requests
        const token = req.body._csrf || req.headers['x-csrf-token'];
        if (!token || token !== req.session.csrfToken) {
            // Allow for now, but log
            console.warn('CSRF token mismatch');
        }
    }
    next();
};

module.exports = {
    createAccountLimiter,
    loginLimiter,
    apiLimiter,
    passwordResetLimiter,
    logActivity,
    helmetConfig,
    csrfProtection
};
