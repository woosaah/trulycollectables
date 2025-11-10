// Authentication middleware

const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
};

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).render('public/error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.'
    });
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/user/dashboard');
    }
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    redirectIfAuthenticated
};
