const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Register page
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('public/register', {
        title: 'Register',
        errors: [],
        formData: {}
    });
});

// Register handler
router.post('/register', [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
], async (req, res) => {
    const errors = validationResult(req);
    const { username, email, password } = req.body;

    if (!errors.isEmpty()) {
        return res.render('public/register', {
            title: 'Register',
            errors: errors.array(),
            formData: { username, email }
        });
    }

    try {
        // Check if username already exists
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return res.render('public/register', {
                title: 'Register',
                errors: [{ msg: 'Username already taken' }],
                formData: { username, email }
            });
        }

        // Check if email already exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.render('public/register', {
                title: 'Register',
                errors: [{ msg: 'Email already registered' }],
                formData: { username, email }
            });
        }

        // Create user
        const user = await User.create(username, email, password);

        // Log the user in
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('public/register', {
            title: 'Register',
            errors: [{ msg: 'An error occurred. Please try again.' }],
            formData: { username, email }
        });
    }
});

// Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('public/login', {
        title: 'Login',
        errors: [],
        redirect: req.query.redirect || '/user/dashboard'
    });
});

// Login handler
router.post('/login', [
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    const { email, password } = req.body;
    const redirect = req.body.redirect || '/user/dashboard';

    if (!errors.isEmpty()) {
        return res.render('public/login', {
            title: 'Login',
            errors: errors.array(),
            redirect
        });
    }

    try {
        const user = await User.findByEmail(email);

        if (!user) {
            return res.render('public/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                redirect
            });
        }

        const isValidPassword = await User.verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
            return res.render('public/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                redirect
            });
        }

        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        res.redirect(redirect);
    } catch (error) {
        console.error('Login error:', error);
        res.render('public/login', {
            title: 'Login',
            errors: [{ msg: 'An error occurred. Please try again.' }],
            redirect
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
