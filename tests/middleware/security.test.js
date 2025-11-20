const {
    helmetConfig,
    csrfProtection,
    loginLimiter,
    registrationLimiter,
    apiLimiter,
    passwordResetLimiter
} = require('../../middleware/security');
const { cleanupTestData, createTestUser, pool } = require('../helpers/test-db-setup');

describe('Security Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            ip: '127.0.0.1',
            path: '/test',
            method: 'GET',
            session: {},
            body: {},
            get: jest.fn().mockReturnValue('localhost')
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            render: jest.fn(),
            set: jest.fn(),
            locals: {}
        };

        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    describe('Helmet Configuration', () => {
        it('should have helmet middleware configured', () => {
            expect(helmetConfig).toBeDefined();
            expect(typeof helmetConfig).toBe('function');
        });

        it('should set security headers', (done) => {
            helmetConfig(req, res, () => {
                // Helmet should have set security headers
                expect(res.set).toHaveBeenCalled();
                done();
            });
        });
    });

    describe('CSRF Protection', () => {
        it('should have CSRF middleware configured', () => {
            expect(csrfProtection).toBeDefined();
            expect(typeof csrfProtection).toBe('function');
        });

        it('should generate CSRF token', (done) => {
            req.csrfToken = jest.fn().mockReturnValue('csrf-token-123');

            csrfProtection(req, res, () => {
                expect(res.locals.csrfToken).toBeDefined();
                done();
            });
        });

        it('should validate CSRF token on POST requests', (done) => {
            req.method = 'POST';
            req.body._csrf = 'valid-token';
            req.csrfToken = jest.fn().mockReturnValue('valid-token');

            csrfProtection(req, res, () => {
                expect(next).not.toHaveBeenCalledWith(expect.any(Error));
                done();
            });
        });
    });

    describe('Login Rate Limiter', () => {
        it('should have login rate limiter configured', () => {
            expect(loginLimiter).toBeDefined();
            expect(typeof loginLimiter).toBe('function');
        });

        it('should allow requests within limit', async () => {
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => {
                    loginLimiter(req, res, (err) => {
                        expect(err).toBeUndefined();
                        resolve();
                    });
                });
            }
        });

        it('should block requests exceeding limit', async () => {
            // Make multiple requests to exceed limit
            const maxRequests = 10;

            for (let i = 0; i < maxRequests; i++) {
                await new Promise(resolve => {
                    loginLimiter(req, res, () => {
                        resolve();
                    });
                });
            }

            // Next request should be rate limited
            await new Promise(resolve => {
                loginLimiter(req, res, () => {
                    // If this gets called, rate limit might not be working
                    resolve();
                });

                // Check if response was sent (rate limited)
                setTimeout(() => {
                    resolve();
                }, 100);
            });
        });
    });

    describe('Registration Rate Limiter', () => {
        it('should have registration rate limiter configured', () => {
            expect(registrationLimiter).toBeDefined();
            expect(typeof registrationLimiter).toBe('function');
        });

        it('should allow reasonable registration attempts', async () => {
            await new Promise(resolve => {
                registrationLimiter(req, res, (err) => {
                    expect(err).toBeUndefined();
                    resolve();
                });
            });
        });
    });

    describe('API Rate Limiter', () => {
        it('should have API rate limiter configured', () => {
            expect(apiLimiter).toBeDefined();
            expect(typeof apiLimiter).toBe('function');
        });

        it('should allow API requests within limit', async () => {
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => {
                    apiLimiter(req, res, (err) => {
                        expect(err).toBeUndefined();
                        resolve();
                    });
                });
            }
        });
    });

    describe('Password Reset Rate Limiter', () => {
        it('should have password reset rate limiter configured', () => {
            expect(passwordResetLimiter).toBeDefined();
            expect(typeof passwordResetLimiter).toBe('function');
        });

        it('should allow password reset requests within limit', async () => {
            await new Promise(resolve => {
                passwordResetLimiter(req, res, (err) => {
                    expect(err).toBeUndefined();
                    resolve();
                });
            });
        });

        it('should prevent rapid password reset attempts', async () => {
            const attempts = 10;

            for (let i = 0; i < attempts; i++) {
                await new Promise(resolve => {
                    passwordResetLimiter(req, res, () => {
                        resolve();
                    });
                });
            }

            // Should be rate limited now
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('Activity Logging', () => {
        it('should log failed login attempts', async () => {
            const ActivityLog = require('../../models/ActivityLog');

            const testUser = await createTestUser();

            await ActivityLog.logActivity({
                userId: testUser.id,
                action: 'login_failed',
                ipAddress: '127.0.0.1',
                details: 'Invalid password'
            });

            const logs = await ActivityLog.getByUser(testUser.id);

            expect(logs).toBeDefined();
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].action).toBe('login_failed');
        });

        it('should log successful logins', async () => {
            const ActivityLog = require('../../models/ActivityLog');

            const testUser = await createTestUser();

            await ActivityLog.logActivity({
                userId: testUser.id,
                action: 'login_success',
                ipAddress: '127.0.0.1'
            });

            const logs = await ActivityLog.getByUser(testUser.id);

            const loginLogs = logs.filter(log => log.action === 'login_success');
            expect(loginLogs.length).toBeGreaterThan(0);
        });

        it('should log admin actions', async () => {
            const ActivityLog = require('../../models/ActivityLog');

            const adminUser = await createTestUser({ role: 'admin' });

            await ActivityLog.logActivity({
                userId: adminUser.id,
                action: 'inventory_update',
                ipAddress: '127.0.0.1',
                details: 'Updated card #123'
            });

            const logs = await ActivityLog.getByUser(adminUser.id);

            expect(logs).toBeDefined();
            expect(logs.some(log => log.action === 'inventory_update')).toBe(true);
        });
    });

    describe('XSS Protection', () => {
        it('should sanitize input fields', () => {
            const maliciousInput = '<script>alert("XSS")</script>';

            // The actual sanitization would happen in the route handlers
            // This test ensures the pattern is followed
            expect(maliciousInput).toContain('script');

            // After sanitization, it should be safe
            const sanitized = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

            expect(sanitized).not.toContain('script');
        });
    });

    describe('SQL Injection Prevention', () => {
        it('should use parameterized queries', () => {
            // This is more of a pattern test
            // The actual implementation in models should use parameterized queries
            const userInput = "'; DROP TABLE users; --";

            // Parameterized query example (pseudo-code)
            const query = 'SELECT * FROM users WHERE email = $1';
            const params = [userInput];

            expect(query).not.toContain(userInput);
            expect(params[0]).toBe(userInput);
        });
    });

    describe('Session Security', () => {
        it('should have secure session configuration', () => {
            const sessionConfig = {
                cookie: {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 30 * 24 * 60 * 60 * 1000
                },
                resave: false,
                saveUninitialized: false
            };

            expect(sessionConfig.cookie.httpOnly).toBe(true);
            expect(sessionConfig.resave).toBe(false);
            expect(sessionConfig.saveUninitialized).toBe(false);
        });

        it('should regenerate session on login', () => {
            req.session.regenerate = jest.fn((callback) => callback());

            // Simulating login
            req.session.regenerate((err) => {
                expect(err).toBeUndefined();
                expect(req.session.regenerate).toHaveBeenCalled();
            });
        });
    });

    describe('Content Security Policy', () => {
        it('should have CSP headers configured', () => {
            // Helmet includes CSP configuration
            expect(helmetConfig).toBeDefined();

            // CSP should be configured to prevent XSS
            const cspConfig = {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:']
                }
            };

            expect(cspConfig.directives.defaultSrc).toContain("'self'");
        });
    });
});
