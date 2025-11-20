const Figurine = require('../../models/Figurine');
const { cleanupTestData, createTestFigurine, pool } = require('../helpers/test-db-setup');

describe('Figurine Model', () => {
    beforeAll(async () => {
        await cleanupTestData();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create', () => {
        it('should create a new figurine', async () => {
            const figurineData = {
                productName: 'Test Figurine ' + Date.now(),
                category: 'basketball',
                priceNzd: 25.00,
                quantity: 5,
                description: 'Test figurine description'
            };

            const figurine = await Figurine.create(figurineData);

            expect(figurine).toBeDefined();
            expect(figurine.id).toBeDefined();
            expect(figurine.product_name).toBe(figurineData.productName);
            expect(parseFloat(figurine.price_nzd)).toBe(figurineData.priceNzd);
            expect(figurine.status).toBe('pending');
        });
    });

    describe('findById', () => {
        it('should find figurine by id', async () => {
            const testFigurine = await createTestFigurine();
            const figurine = await Figurine.findById(testFigurine.id);

            expect(figurine).toBeDefined();
            expect(figurine.id).toBe(testFigurine.id);
        });

        it('should return null for non-existent id', async () => {
            const figurine = await Figurine.findById(999999);
            expect(figurine).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return all figurines', async () => {
            await createTestFigurine();
            await createTestFigurine();

            const figurines = await Figurine.findAll();

            expect(figurines).toBeDefined();
            expect(figurines.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter by status', async () => {
            await createTestFigurine({ status: 'approved' });
            await createTestFigurine({ status: 'approved' });

            const approved = await Figurine.findAll({ status: 'approved' });

            expect(approved).toBeDefined();
            approved.forEach(fig => {
                expect(fig.status).toBe('approved');
            });
        });

        it('should filter by category', async () => {
            await createTestFigurine({ category: 'basketball' });
            await createTestFigurine({ category: 'football' });

            const basketball = await Figurine.findAll({ category: 'basketball' });

            expect(basketball).toBeDefined();
            basketball.forEach(fig => {
                expect(fig.category).toBe('basketball');
            });
        });
    });

    describe('update', () => {
        it('should update figurine fields', async () => {
            const figurine = await createTestFigurine();

            const updated = await Figurine.update(figurine.id, {
                product_name: 'Updated Name',
                price_nzd: 30.00,
                quantity: 10
            });

            expect(updated.product_name).toBe('Updated Name');
            expect(parseFloat(updated.price_nzd)).toBe(30.00);
            expect(updated.quantity).toBe(10);
        });
    });

    describe('approve', () => {
        it('should approve a pending figurine', async () => {
            const figurine = await createTestFigurine({ status: 'pending' });

            const approved = await Figurine.approve(figurine.id);

            expect(approved.status).toBe('approved');
        });
    });

    describe('reject', () => {
        it('should reject a pending figurine', async () => {
            const figurine = await createTestFigurine({ status: 'pending' });

            const rejected = await Figurine.reject(figurine.id);

            expect(rejected.status).toBe('rejected');
        });
    });

    describe('delete', () => {
        it('should delete figurine', async () => {
            const figurine = await createTestFigurine();

            await Figurine.delete(figurine.id);

            const deleted = await Figurine.findById(figurine.id);
            expect(deleted).toBeNull();
        });
    });

    describe('search', () => {
        it('should search figurines by name', async () => {
            await createTestFigurine({ product_name: 'Unique Search Name' });

            const results = await Figurine.search({ query: 'Unique Search' });

            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('updateQuantity', () => {
        it('should update figurine quantity', async () => {
            const figurine = await createTestFigurine({ quantity: 5 });

            const updated = await Figurine.updateQuantity(figurine.id, 10);

            expect(updated.quantity).toBe(10);
        });
    });
});
