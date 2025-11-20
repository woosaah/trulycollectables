const Order = require('../../models/Order');
const { cleanupTestData, createTestUser, createTestCard, createTestOrder, pool } = require('../helpers/test-db-setup');

describe('Order Model', () => {
    let testUser;
    let testCard;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        testUser = await createTestUser();
        testCard = await createTestCard();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create', () => {
        it('should create a new order with items', async () => {
            const orderData = {
                userId: testUser.id,
                items: [
                    {
                        card_id: testCard.id,
                        quantity: 2,
                        price_nzd: testCard.price_nzd
                    }
                ],
                total: testCard.price_nzd * 2,
                shippingAddress: 'Test Address',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            };

            const order = await Order.create(orderData);

            expect(order).toBeDefined();
            expect(order.id).toBeDefined();
            expect(order.user_id).toBe(testUser.id);
            expect(parseFloat(order.total_nzd)).toBe(orderData.total);
            expect(order.status).toBe('pending');
        });

        it('should create order with correct order number', async () => {
            const orderData = {
                userId: testUser.id,
                items: [
                    {
                        card_id: testCard.id,
                        quantity: 1,
                        price_nzd: testCard.price_nzd
                    }
                ],
                total: testCard.price_nzd,
                shippingAddress: 'Test Address',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            };

            const order = await Order.create(orderData);

            expect(order.order_number).toBeDefined();
            expect(order.order_number).toMatch(/^ORD-/);
        });
    });

    describe('findById', () => {
        it('should find order by id', async () => {
            const testOrder = await createTestOrder(testUser.id);
            const order = await Order.findById(testOrder.id);

            expect(order).toBeDefined();
            expect(order.id).toBe(testOrder.id);
            expect(order.user_id).toBe(testUser.id);
        });

        it('should return null for non-existent id', async () => {
            const order = await Order.findById(999999);
            expect(order).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should find all orders for a user', async () => {
            await createTestOrder(testUser.id);
            await createTestOrder(testUser.id);
            await createTestOrder(testUser.id);

            const orders = await Order.findByUserId(testUser.id);

            expect(orders).toBeDefined();
            expect(orders.length).toBe(3);
            orders.forEach(order => {
                expect(order.user_id).toBe(testUser.id);
            });
        });

        it('should return empty array for user with no orders', async () => {
            const newUser = await createTestUser();
            const orders = await Order.findByUserId(newUser.id);

            expect(orders).toBeDefined();
            expect(orders.length).toBe(0);
        });
    });

    describe('findByOrderNumber', () => {
        it('should find order by order number', async () => {
            const testOrder = await createTestOrder(testUser.id);

            // Get the order to see its order number
            const order = await Order.findById(testOrder.id);
            const foundOrder = await Order.findByOrderNumber(order.order_number);

            expect(foundOrder).toBeDefined();
            expect(foundOrder.id).toBe(testOrder.id);
            expect(foundOrder.order_number).toBe(order.order_number);
        });
    });

    describe('updateStatus', () => {
        it('should update order status', async () => {
            const testOrder = await createTestOrder(testUser.id, { status: 'pending' });

            const updated = await Order.updateStatus(testOrder.id, 'processing');

            expect(updated.status).toBe('processing');
        });

        it('should update status to completed', async () => {
            const testOrder = await createTestOrder(testUser.id);

            const updated = await Order.updateStatus(testOrder.id, 'completed');

            expect(updated.status).toBe('completed');
        });
    });

    describe('findAll', () => {
        it('should return all orders', async () => {
            await createTestOrder(testUser.id);
            await createTestOrder(testUser.id);

            const orders = await Order.findAll();

            expect(orders).toBeDefined();
            expect(orders.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter orders by status', async () => {
            await createTestOrder(testUser.id, { status: 'pending' });
            await createTestOrder(testUser.id, { status: 'completed' });

            const pendingOrders = await Order.findAll({ status: 'pending' });

            expect(pendingOrders).toBeDefined();
            pendingOrders.forEach(order => {
                expect(order.status).toBe('pending');
            });
        });
    });

    describe('getOrderItems', () => {
        it('should get all items for an order', async () => {
            const orderData = {
                userId: testUser.id,
                items: [
                    {
                        card_id: testCard.id,
                        quantity: 2,
                        price_nzd: testCard.price_nzd
                    }
                ],
                total: testCard.price_nzd * 2,
                shippingAddress: 'Test Address',
                shippingCity: 'Test City',
                shippingPostcode: '1234',
                contactEmail: testUser.email
            };

            const order = await Order.create(orderData);
            const items = await Order.getOrderItems(order.id);

            expect(items).toBeDefined();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].card_id).toBe(testCard.id);
            expect(items[0].quantity).toBe(2);
        });
    });

    describe('delete', () => {
        it('should delete order by id', async () => {
            const testOrder = await createTestOrder(testUser.id);
            await Order.delete(testOrder.id);

            const order = await Order.findById(testOrder.id);
            expect(order).toBeNull();
        });
    });
});
