const request = require('supertest');
const app = require('../../server');
const { cleanupTestData, createTestUser, createTestCard, pool } = require('../helpers/test-db-setup');
const User = require('../../models/User');

describe('User Routes', () => {
    let testUser;
    let agent;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        // Create authenticated session
        const password = 'TestPassword123!';
        testUser = await User.create({
            username: 'testuser' + Date.now(),
            email: 'testuser' + Date.now() + '@test.com',
            password: password,
            firstName: 'Test',
            lastName: 'User'
        });

        // Create agent to maintain session
        agent = request.agent(app);

        // Login
        await agent
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: password
            });
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /user/dashboard', () => {
        it('should render user dashboard when authenticated', async () => {
            const response = await agent
                .get('/user/dashboard');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Dashboard');
        });

        it('should redirect to login when not authenticated', async () => {
            const response = await request(app)
                .get('/user/dashboard');

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/auth/login');
        });
    });

    describe('GET /user/collection', () => {
        it('should render user collection page', async () => {
            const response = await agent
                .get('/user/collection');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Collection');
        });
    });

    describe('POST /user/collection/add-have', () => {
        it('should add card to have list', async () => {
            const card = await createTestCard();

            const response = await agent
                .post('/user/collection/add-have')
                .send({ cardId: card.id });

            expect(response.status).toBe(302);
        });
    });

    describe('POST /user/collection/add-want', () => {
        it('should add card to want list', async () => {
            const card = await createTestCard();

            const response = await agent
                .post('/user/collection/add-want')
                .send({ cardId: card.id });

            expect(response.status).toBe(302);
        });
    });

    describe('GET /user/collection/export', () => {
        it('should export collection to CSV', async () => {
            const Collection = require('../../models/Collection');
            const card = await createTestCard();

            await Collection.addToHave(testUser.id, card.id);

            const response = await agent
                .get('/user/collection/export');

            expect(response.status).toBe(200);
            expect(response.header['content-type']).toContain('text/csv');
        });
    });

    describe('GET /user/cart', () => {
        it('should render cart page', async () => {
            const response = await agent
                .get('/user/cart');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Cart');
        });
    });

    describe('POST /user/cart/add-card', () => {
        it('should add card to cart', async () => {
            const card = await createTestCard({ quantity: 10 });

            const response = await agent
                .post('/user/cart/add-card')
                .send({
                    cardId: card.id,
                    quantity: 2
                });

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/user/cart');
        });

        it('should reject adding card with insufficient quantity', async () => {
            const card = await createTestCard({ quantity: 1 });

            const response = await agent
                .post('/user/cart/add-card')
                .send({
                    cardId: card.id,
                    quantity: 5
                });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /user/cart/update-quantity', () => {
        it('should update cart item quantity', async () => {
            const Cart = require('../../models/Cart');
            const card = await createTestCard({ quantity: 10 });

            const item = await Cart.addCard(testUser.id, card.id, 2);

            const response = await agent
                .post('/user/cart/update-quantity')
                .send({
                    itemId: item.id,
                    quantity: 5
                });

            expect(response.status).toBe(200);
        });
    });

    describe('POST /user/cart/remove-item', () => {
        it('should remove item from cart', async () => {
            const Cart = require('../../models/Cart');
            const card = await createTestCard();

            const item = await Cart.addCard(testUser.id, card.id, 1);

            const response = await agent
                .post('/user/cart/remove-item')
                .send({ itemId: item.id });

            expect(response.status).toBe(302);
        });
    });

    describe('GET /user/checkout', () => {
        it('should render checkout page with items in cart', async () => {
            const Cart = require('../../models/Cart');
            const card = await createTestCard();

            await Cart.addCard(testUser.id, card.id, 1);

            const response = await agent
                .get('/user/checkout');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Checkout');
        });

        it('should redirect to cart if cart is empty', async () => {
            const response = await agent
                .get('/user/checkout');

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/user/cart');
        });
    });

    describe('POST /user/checkout', () => {
        it('should process checkout with valid data', async () => {
            const Cart = require('../../models/Cart');
            const card = await createTestCard({ quantity: 10 });

            await Cart.addCard(testUser.id, card.id, 2);

            const checkoutData = {
                shippingAddress: '123 Test St',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            };

            const response = await agent
                .post('/user/checkout')
                .send(checkoutData);

            expect(response.status).toBe(302);
            expect(response.header.location).toContain('/user/order/');
        });

        it('should reject checkout with empty cart', async () => {
            const checkoutData = {
                shippingAddress: '123 Test St',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            };

            const response = await agent
                .post('/user/checkout')
                .send(checkoutData);

            expect(response.status).toBe(400);
        });
    });

    describe('GET /user/orders', () => {
        it('should render user orders page', async () => {
            const response = await agent
                .get('/user/orders');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Orders');
        });
    });

    describe('GET /user/order/:id', () => {
        it('should render order details page for user order', async () => {
            const Order = require('../../models/Order');
            const card = await createTestCard();

            const order = await Order.create({
                userId: testUser.id,
                items: [{
                    card_id: card.id,
                    quantity: 1,
                    price_nzd: card.price_nzd
                }],
                total: card.price_nzd,
                shippingAddress: 'Test Address',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            });

            const response = await agent
                .get(`/user/order/${order.id}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Order Details');
        });

        it('should not allow viewing other user orders', async () => {
            const Order = require('../../models/Order');
            const otherUser = await createTestUser();
            const card = await createTestCard();

            const order = await Order.create({
                userId: otherUser.id,
                items: [{
                    card_id: card.id,
                    quantity: 1,
                    price_nzd: card.price_nzd
                }],
                total: card.price_nzd,
                shippingAddress: 'Test Address',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: otherUser.email
            });

            const response = await agent
                .get(`/user/order/${order.id}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /user/wishlist', () => {
        it('should render wishlist page', async () => {
            const response = await agent
                .get('/user/wishlist');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Wishlist');
        });
    });

    describe('POST /user/wishlist/add-card', () => {
        it('should add card to wishlist', async () => {
            const card = await createTestCard();

            const response = await agent
                .post('/user/wishlist/add-card')
                .send({ cardId: card.id });

            expect(response.status).toBe(302);
        });
    });

    describe('POST /user/wishlist/remove', () => {
        it('should remove card from wishlist', async () => {
            const Wishlist = require('../../models/Wishlist');
            const card = await createTestCard();

            await Wishlist.addCard(testUser.id, card.id);

            const response = await agent
                .post('/user/wishlist/remove')
                .send({ cardId: card.id });

            expect(response.status).toBe(302);
        });
    });

    describe('GET /user/profile', () => {
        it('should render user profile page', async () => {
            const response = await agent
                .get('/user/profile');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Profile');
        });
    });

    describe('POST /user/profile/update', () => {
        it('should update user profile', async () => {
            const response = await agent
                .post('/user/profile/update')
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(response.status).toBe(302);
        });
    });
});
