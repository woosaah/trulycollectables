const { requireAuth, requireAdmin, redirectIfAuthenticated } = require('../../middleware/auth');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            session: {},
            path: '/test'
        };

        res = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            render: jest.fn(),
            locals: {}
        };

        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('requireAuth', () => {
        it('should allow authenticated users to proceed', () => {
            req.session.user = {
                id: 1,
                email: 'test@test.com',
                role: 'customer'
            };

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should redirect unauthenticated users to login', () => {
            req.session.user = null;

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
            expect(next).not.toHaveBeenCalled();
        });

        it('should set returnTo URL in session', () => {
            req.session.user = null;
            req.path = '/user/dashboard';

            requireAuth(req, res, next);

            expect(req.session.returnTo).toBe('/user/dashboard');
            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
        });
    });

    describe('requireAdmin', () => {
        it('should allow admin users to proceed', () => {
            req.session.user = {
                id: 1,
                email: 'admin@test.com',
                role: 'admin'
            };

            requireAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should deny non-admin users', () => {
            req.session.user = {
                id: 2,
                email: 'user@test.com',
                role: 'customer'
            };

            requireAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.render).toHaveBeenCalledWith('public/error', expect.objectContaining({
                message: expect.stringContaining('not authorized')
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it('should deny unauthenticated users', () => {
            req.session.user = null;

            requireAdmin(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('redirectIfAuthenticated', () => {
        it('should redirect authenticated users to home', () => {
            req.session.user = {
                id: 1,
                email: 'test@test.com',
                role: 'customer'
            };

            redirectIfAuthenticated(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/');
            expect(next).not.toHaveBeenCalled();
        });

        it('should allow unauthenticated users to proceed', () => {
            req.session.user = null;

            redirectIfAuthenticated(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.redirect).not.toHaveBeenCalled();
        });

        it('should redirect to returnTo URL if set', () => {
            req.session.user = {
                id: 1,
                email: 'test@test.com',
                role: 'customer'
            };
            req.session.returnTo = '/user/dashboard';

            redirectIfAuthenticated(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/user/dashboard');
            expect(req.session.returnTo).toBeUndefined();
        });
    });

    describe('Session handling', () => {
        it('should handle missing session object', () => {
            req.session = undefined;

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
        });

        it('should handle corrupted session user data', () => {
            req.session.user = 'invalid_data';

            requireAuth(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/auth/login');
        });

        it('should handle session user without role', () => {
            req.session.user = {
                id: 1,
                email: 'test@test.com'
                // Missing role property
            };

            requireAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty user object', () => {
            req.session.user = {};

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle user with admin role case-insensitively', () => {
            req.session.user = {
                id: 1,
                email: 'admin@test.com',
                role: 'ADMIN'
            };

            requireAdmin(req, res, next);

            // Should handle if implementation is case-sensitive
            expect(next).toHaveBeenCalled();
        });
    });
});
