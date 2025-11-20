const Coupon = require('../../models/Coupon');
const { cleanupTestData, pool } = require('../helpers/test-db-setup');

describe('Coupon Model', () => {
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
        it('should create a percentage discount coupon', async () => {
            const couponData = {
                code: 'TEST10' + Date.now(),
                discountType: 'percentage',
                discountValue: 10,
                minPurchase: 50,
                maxUses: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const coupon = await Coupon.create(couponData);

            expect(coupon).toBeDefined();
            expect(coupon.id).toBeDefined();
            expect(coupon.code).toBe(couponData.code);
            expect(coupon.discount_type).toBe('percentage');
            expect(parseFloat(coupon.discount_value)).toBe(10);
        });

        it('should create a fixed discount coupon', async () => {
            const couponData = {
                code: 'SAVE20' + Date.now(),
                discountType: 'fixed',
                discountValue: 20,
                minPurchase: 100,
                maxUses: 50,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const coupon = await Coupon.create(couponData);

            expect(coupon).toBeDefined();
            expect(coupon.discount_type).toBe('fixed');
            expect(parseFloat(coupon.discount_value)).toBe(20);
        });

        it('should not create duplicate coupon codes', async () => {
            const code = 'DUPLICATE' + Date.now();

            await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await expect(Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 15,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            })).rejects.toThrow();
        });
    });

    describe('findByCode', () => {
        it('should find coupon by code', async () => {
            const code = 'FINDME' + Date.now();

            await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const coupon = await Coupon.findByCode(code);

            expect(coupon).toBeDefined();
            expect(coupon.code).toBe(code);
        });

        it('should return null for non-existent code', async () => {
            const coupon = await Coupon.findByCode('NONEXISTENT');
            expect(coupon).toBeNull();
        });
    });

    describe('validate', () => {
        it('should validate active coupon', async () => {
            const code = 'VALID' + Date.now();

            await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                minPurchase: 50,
                maxUses: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: true
            });

            const validation = await Coupon.validate(code, 100);

            expect(validation.valid).toBe(true);
            expect(validation.coupon).toBeDefined();
        });

        it('should reject expired coupon', async () => {
            const code = 'EXPIRED' + Date.now();

            await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                validUntil: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                isActive: true
            });

            const validation = await Coupon.validate(code, 100);

            expect(validation.valid).toBe(false);
            expect(validation.error).toContain('expired');
        });

        it('should reject purchase below minimum', async () => {
            const code = 'MINPURCHASE' + Date.now();

            await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                minPurchase: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: true
            });

            const validation = await Coupon.validate(code, 50);

            expect(validation.valid).toBe(false);
            expect(validation.error).toContain('minimum');
        });
    });

    describe('calculateDiscount', () => {
        it('should calculate percentage discount correctly', async () => {
            const code = 'CALC10' + Date.now();

            const coupon = await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const discount = await Coupon.calculateDiscount(coupon.id, 100);

            expect(parseFloat(discount)).toBe(10);
        });

        it('should calculate fixed discount correctly', async () => {
            const code = 'FIXED20' + Date.now();

            const coupon = await Coupon.create({
                code: code,
                discountType: 'fixed',
                discountValue: 20,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const discount = await Coupon.calculateDiscount(coupon.id, 100);

            expect(parseFloat(discount)).toBe(20);
        });
    });

    describe('incrementUsage', () => {
        it('should increment usage count', async () => {
            const code = 'USAGE' + Date.now();

            const coupon = await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                maxUses: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await Coupon.incrementUsage(coupon.id);
            const updated = await Coupon.findByCode(code);

            expect(updated.times_used).toBe(1);
        });
    });

    describe('findAll', () => {
        it('should return all coupons', async () => {
            await Coupon.create({
                code: 'ALL1' + Date.now(),
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await Coupon.create({
                code: 'ALL2' + Date.now(),
                discountType: 'fixed',
                discountValue: 15,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const coupons = await Coupon.findAll();

            expect(coupons).toBeDefined();
            expect(coupons.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('update', () => {
        it('should update coupon', async () => {
            const code = 'UPDATE' + Date.now();

            const coupon = await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const updated = await Coupon.update(coupon.id, {
                discount_value: 15,
                is_active: false
            });

            expect(parseFloat(updated.discount_value)).toBe(15);
            expect(updated.is_active).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete coupon', async () => {
            const code = 'DELETE' + Date.now();

            const coupon = await Coupon.create({
                code: code,
                discountType: 'percentage',
                discountValue: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await Coupon.delete(coupon.id);

            const deleted = await Coupon.findByCode(code);
            expect(deleted).toBeNull();
        });
    });
});
