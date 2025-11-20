const request = require('supertest');
const app = require('../../server');
const { cleanupTestData, createTestUser, createTestCard, createTestOrder, pool } = require('../helpers/test-db-setup');
const User = require('../../models/User');

describe('Admin Routes', () => {
    let adminUser;
    let agent;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        // Create admin user and authenticate
        const password = 'AdminPassword123!';
        adminUser = await User.create({
            username: 'admin' + Date.now(),
            email: 'admin' + Date.now() + '@test.com',
            password: password,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin'
        });

        // Create agent to maintain session
        agent = request.agent(app);

        // Login as admin
        await agent
            .post('/auth/login')
            .send({
                email: adminUser.email,
                password: password
            });
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /admin/dashboard', () => {
        it('should render admin dashboard when authenticated as admin', async () => {
            const response = await agent
                .get('/admin/dashboard');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Admin Dashboard');
        });

        it('should redirect to login when not authenticated', async () => {
            const response = await request(app)
                .get('/admin/dashboard');

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/auth/login');
        });

        it('should deny access to non-admin users', async () => {
            const regularUser = await User.create({
                username: 'regular' + Date.now(),
                email: 'regular' + Date.now() + '@test.com',
                password: 'Password123!',
                firstName: 'Regular',
                lastName: 'User',
                role: 'customer'
            });

            const regularAgent = request.agent(app);
            await regularAgent
                .post('/auth/login')
                .send({
                    email: regularUser.email,
                    password: 'Password123!'
                });

            const response = await regularAgent
                .get('/admin/dashboard');

            expect(response.status).toBe(403);
        });
    });

    describe('GET /admin/inventory', () => {
        it('should render inventory management page', async () => {
            const response = await agent
                .get('/admin/inventory');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Inventory');
        });
    });

    describe('GET /admin/inventory/add', () => {
        it('should render add inventory page', async () => {
            const response = await agent
                .get('/admin/inventory/add');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Add');
        });
    });

    describe('POST /admin/inventory/add', () => {
        it('should add new card to inventory', async () => {
            const cardData = {
                cardName: 'Admin Test Card ' + Date.now(),
                setName: 'Test Set',
                sport: 'basketball',
                cardNumber: 'TEST-' + Date.now(),
                year: 2023,
                condition: 'mint',
                priceNzd: 10.00,
                quantity: 5,
                graded: false
            };

            const response = await agent
                .post('/admin/inventory/add')
                .send(cardData);

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/admin/inventory');
        });

        it('should validate required fields', async () => {
            const invalidData = {
                cardName: 'Test Card'
                // Missing required fields
            };

            const response = await agent
                .post('/admin/inventory/add')
                .send(invalidData);

            expect(response.status).toBe(400);
        });
    });

    describe('GET /admin/inventory/edit/:id', () => {
        it('should render edit card page', async () => {
            const card = await createTestCard();

            const response = await agent
                .get(`/admin/inventory/edit/${card.id}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Edit');
            expect(response.text).toContain(card.card_name);
        });

        it('should return 404 for non-existent card', async () => {
            const response = await agent
                .get('/admin/inventory/edit/999999');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /admin/inventory/edit/:id', () => {
        it('should update card details', async () => {
            const card = await createTestCard();

            const updateData = {
                cardName: 'Updated Card Name',
                priceNzd: 15.00,
                quantity: 10
            };

            const response = await agent
                .post(`/admin/inventory/edit/${card.id}`)
                .send(updateData);

            expect(response.status).toBe(302);
        });
    });

    describe('POST /admin/inventory/delete/:id', () => {
        it('should delete card from inventory', async () => {
            const card = await createTestCard();

            const response = await agent
                .post(`/admin/inventory/delete/${card.id}`);

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/admin/inventory');
        });
    });

    describe('GET /admin/orders', () => {
        it('should render orders management page', async () => {
            const response = await agent
                .get('/admin/orders');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Orders');
        });
    });

    describe('GET /admin/order/:id', () => {
        it('should render order details page', async () => {
            const customer = await createTestUser();
            const order = await createTestOrder(customer.id);

            const response = await agent
                .get(`/admin/order/${order.id}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Order Details');
        });
    });

    describe('POST /admin/order/:id/update-status', () => {
        it('should update order status', async () => {
            const customer = await createTestUser();
            const order = await createTestOrder(customer.id, { status: 'pending' });

            const response = await agent
                .post(`/admin/order/${order.id}/update-status`)
                .send({ status: 'processing' });

            expect(response.status).toBe(302);
        });

        it('should reject invalid status', async () => {
            const customer = await createTestUser();
            const order = await createTestOrder(customer.id);

            const response = await agent
                .post(`/admin/order/${order.id}/update-status`)
                .send({ status: 'invalid_status' });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /admin/figurines', () => {
        it('should render figurines management page', async () => {
            const response = await agent
                .get('/admin/figurines');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Figurines');
        });
    });

    describe('POST /admin/figurine/:id/approve', () => {
        it('should approve pending figurine', async () => {
            const Figurine = require('../../models/Figurine');

            const figurine = await Figurine.create({
                productName: 'Test Figurine',
                category: 'basketball',
                priceNzd: 25.00,
                quantity: 5,
                description: 'Test'
            });

            const response = await agent
                .post(`/admin/figurine/${figurine.id}/approve`);

            expect(response.status).toBe(302);
        });
    });

    describe('POST /admin/figurine/:id/reject', () => {
        it('should reject pending figurine', async () => {
            const Figurine = require('../../models/Figurine');

            const figurine = await Figurine.create({
                productName: 'Test Figurine',
                category: 'basketball',
                priceNzd: 25.00,
                quantity: 5,
                description: 'Test'
            });

            const response = await agent
                .post(`/admin/figurine/${figurine.id}/reject`);

            expect(response.status).toBe(302);
        });
    });

    describe('GET /admin/inquiries', () => {
        it('should render inquiries page', async () => {
            const response = await agent
                .get('/admin/inquiries');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Inquiries');
        });
    });

    describe('GET /admin/users', () => {
        it('should render users management page', async () => {
            const response = await agent
                .get('/admin/users');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Users');
        });
    });

    describe('POST /admin/user/:id/update-role', () => {
        it('should update user role', async () => {
            const customer = await createTestUser();

            const response = await agent
                .post(`/admin/user/${customer.id}/update-role`)
                .send({ role: 'admin' });

            expect(response.status).toBe(302);
        });
    });

    describe('GET /admin/analytics', () => {
        it('should render analytics dashboard', async () => {
            const response = await agent
                .get('/admin/analytics');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Analytics');
        });
    });

    describe('GET /admin/settings', () => {
        it('should render settings page', async () => {
            const response = await agent
                .get('/admin/settings');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Settings');
        });
    });

    describe('POST /admin/settings/update', () => {
        it('should update system settings', async () => {
            const settingsData = {
                siteName: 'Updated Site Name',
                contactEmail: 'new@test.com'
            };

            const response = await agent
                .post('/admin/settings/update')
                .send(settingsData);

            expect(response.status).toBe(302);
        });
    });

    describe('GET /admin/coupons', () => {
        it('should render coupons management page', async () => {
            const response = await agent
                .get('/admin/coupons');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Coupons');
        });
    });

    describe('POST /admin/coupon/create', () => {
        it('should create new coupon', async () => {
            const couponData = {
                code: 'ADMINTEST' + Date.now(),
                discountType: 'percentage',
                discountValue: 10,
                minPurchase: 50,
                maxUses: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const response = await agent
                .post('/admin/coupon/create')
                .send(couponData);

            expect(response.status).toBe(302);
        });
    });
});
