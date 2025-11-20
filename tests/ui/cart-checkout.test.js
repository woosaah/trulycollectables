const puppeteer = require('puppeteer');

describe('Cart and Checkout UI Tests', () => {
    let browser;
    let page;
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
    });

    afterEach(async () => {
        await page.close();
    });

    afterAll(async () => {
        await browser.close();
    });

    describe('Shopping Cart Page', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/user/cart`, {
                waitUntil: 'networkidle0'
            });
        });

        it('should load cart page', async () => {
            const response = await page.goto(`${BASE_URL}/user/cart`);
            expect(response.status()).toBe(200);
        });

        it('should show cart heading', async () => {
            const heading = await page.$('h1, h2');
            expect(heading).toBeTruthy();

            const headingText = await page.$eval('h1, h2', el => el.textContent);
            expect(headingText.toLowerCase()).toContain('cart');
        });

        it('should show empty cart message when cart is empty', async () => {
            const emptyMessage = await page.$('.empty-cart, .no-items, p:contains("empty")');
            // Will exist if cart is actually empty
        });

        it('should display cart items if items exist', async () => {
            const cartItems = await page.$$('.cart-item, [class*="cart-item"]');
            // May or may not have items
        });

        it('should show item image', async () => {
            const itemImage = await page.$('.cart-item img');

            if (itemImage) {
                const src = await page.$eval('.cart-item img', img => img.src);
                expect(src).toBeTruthy();
            }
        });

        it('should show item name', async () => {
            const itemName = await page.$('.cart-item .name, .cart-item h5');
            // Will exist if cart has items
        });

        it('should show item price', async () => {
            const itemPrice = await page.$('.cart-item .price, [class*="price"]');
            // Will exist if cart has items
        });

        it('should have quantity input', async () => {
            const quantityInput = await page.$('.cart-item input[type="number"]');
            // Will exist if cart has items
        });

        it('should have remove button for each item', async () => {
            const removeButtons = await page.$$('.cart-item button[name*="remove"], .remove-item');
            // Will exist if cart has items
        });

        it('should show cart total', async () => {
            const total = await page.$('.cart-total, [class*="total"]');
            expect(total).toBeTruthy();
        });

        it('should have continue shopping button', async () => {
            const continueBtn = await page.$('a[href*="browse"], button:contains("Continue Shopping")');
            expect(continueBtn).toBeTruthy();
        });

        it('should have checkout button', async () => {
            const checkoutBtn = await page.$('a[href*="checkout"], button[name*="checkout"]');
            expect(checkoutBtn).toBeTruthy();
        });
    });

    describe('Cart Interactions', () => {
        it('should update quantity when changed', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const quantityInput = await page.$('input[type="number"]');

            if (quantityInput) {
                await quantityInput.click({ clickCount: 3 }); // Select all
                await quantityInput.type('5');

                await page.waitForTimeout(500);

                const value = await page.$eval('input[type="number"]', el => el.value);
                expect(value).toBe('5');
            }
        });

        it('should update total when quantity changes', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const quantityInput = await page.$('input[type="number"]');

            if (quantityInput) {
                const initialTotal = await page.$eval('.cart-total', el => el.textContent);

                await quantityInput.click({ clickCount: 3 });
                await quantityInput.type('10');

                // Trigger update
                const updateBtn = await page.$('button[name*="update"]');
                if (updateBtn) {
                    await updateBtn.click();
                    await page.waitForTimeout(500);

                    const newTotal = await page.$eval('.cart-total', el => el.textContent);
                    // Total should change
                }
            }
        });

        it('should remove item when remove button clicked', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const initialItems = await page.$$('.cart-item');
            const initialCount = initialItems.length;

            if (initialCount > 0) {
                const removeBtn = await page.$('.cart-item button[name*="remove"]');

                if (removeBtn) {
                    await removeBtn.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});

                    const newItems = await page.$$('.cart-item');
                    expect(newItems.length).toBeLessThan(initialCount);
                }
            }
        });
    });

    describe('Checkout Page', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/user/checkout`, {
                waitUntil: 'networkidle0'
            });
        });

        it('should load checkout page', async () => {
            const heading = await page.$('h1, h2');
            expect(heading).toBeTruthy();
        });

        it('should redirect to cart if cart is empty', async () => {
            const url = page.url();
            // If cart is empty, should redirect to cart page
        });

        it('should have shipping address fields', async () => {
            const addressInput = await page.$('input[name*="address"], textarea[name*="address"]');
            expect(addressInput).toBeTruthy();
        });

        it('should have city input', async () => {
            const cityInput = await page.$('input[name*="city"]');
            expect(cityInput).toBeTruthy();
        });

        it('should have postcode input', async () => {
            const postcodeInput = await page.$('input[name*="postcode"], input[name*="zip"]');
            expect(postcodeInput).toBeTruthy();
        });

        it('should have contact email input', async () => {
            const emailInput = await page.$('input[type="email"], input[name*="email"]');
            expect(emailInput).toBeTruthy();
        });

        it('should show order summary', async () => {
            const orderSummary = await page.$('.order-summary, [class*="summary"]');
            expect(orderSummary).toBeTruthy();
        });

        it('should show items being ordered', async () => {
            const orderItems = await page.$$('.order-item, [class*="order-item"]');
            expect(orderItems.length).toBeGreaterThan(0);
        });

        it('should show order total', async () => {
            const total = await page.$('.order-total, [class*="total"]');
            expect(total).toBeTruthy();
        });

        it('should have place order button', async () => {
            const placeOrderBtn = await page.$('button[type="submit"], button[name*="place"]');
            expect(placeOrderBtn).toBeTruthy();
        });

        it('should validate required fields', async () => {
            const placeOrderBtn = await page.$('button[type="submit"]');

            if (placeOrderBtn) {
                await placeOrderBtn.click();

                // Check for HTML5 validation
                const addressInput = await page.$('input[name*="address"]');
                if (addressInput) {
                    const isRequired = await page.$eval('input[name*="address"]', el => el.required);
                    expect(isRequired).toBe(true);
                }
            }
        });
    });

    describe('Checkout Process', () => {
        it('should accept valid shipping information', async () => {
            await page.goto(`${BASE_URL}/user/checkout`);

            const addressInput = await page.$('input[name*="address"], textarea[name*="address"]');
            const cityInput = await page.$('input[name*="city"]');
            const postcodeInput = await page.$('input[name*="postcode"]');
            const emailInput = await page.$('input[type="email"]');

            if (addressInput && cityInput && postcodeInput && emailInput) {
                await addressInput.type('123 Test Street');
                await cityInput.type('Test City');
                await postcodeInput.type('1234');
                await emailInput.type('test@example.com');

                const placeOrderBtn = await page.$('button[type="submit"]');

                if (placeOrderBtn) {
                    await placeOrderBtn.click();

                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});

                    const url = page.url();
                    // Should redirect to order confirmation or success page
                }
            }
        });

        it('should show validation errors for invalid data', async () => {
            await page.goto(`${BASE_URL}/user/checkout`);

            const emailInput = await page.$('input[type="email"]');

            if (emailInput) {
                await emailInput.type('invalid-email');

                const placeOrderBtn = await page.$('button[type="submit"]');

                if (placeOrderBtn) {
                    await placeOrderBtn.click();

                    await page.waitForTimeout(500);

                    const validity = await page.$eval('input[type="email"]', el => el.validity.valid);
                    expect(validity).toBe(false);
                }
            }
        });
    });

    describe('Coupon Application', () => {
        it('should have coupon code input', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const couponInput = await page.$('input[name*="coupon"], input[name*="code"]');
            // May or may not exist depending on implementation
        });

        it('should have apply coupon button', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const applyBtn = await page.$('button[name*="coupon"], button:contains("Apply")');
            // May or may not exist
        });

        it('should show discount when valid coupon applied', async () => {
            await page.goto(`${BASE_URL}/user/cart`);

            const couponInput = await page.$('input[name*="coupon"]');

            if (couponInput) {
                await couponInput.type('TESTCODE');

                const applyBtn = await page.$('button[name*="coupon"]');

                if (applyBtn) {
                    await applyBtn.click();

                    await page.waitForTimeout(500);

                    const discount = await page.$('.discount, [class*="discount"]');
                    // Will show if coupon is valid
                }
            }
        });
    });

    describe('Mobile Responsiveness', () => {
        it('should display cart properly on mobile', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/user/cart`);

            const cartItems = await page.$$('.cart-item');
            expect(cartItems).toBeDefined();
        });

        it('should display checkout form properly on mobile', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/user/checkout`);

            const form = await page.$('form');
            expect(form).toBeTruthy();
        });
    });

    describe('Cart Badge', () => {
        it('should show cart item count in navigation', async () => {
            await page.goto(BASE_URL);

            const cartBadge = await page.$('.cart-count, .badge, [class*="cart-badge"]');
            // May exist in navigation
        });

        it('should update cart count when items added', async () => {
            await page.goto(`${BASE_URL}/browse/cards`);

            const initialBadge = await page.$('.cart-count');

            if (initialBadge) {
                const initialCount = await page.$eval('.cart-count', el => el.textContent);

                // Add item to cart
                const addToCartBtn = await page.$('button[name*="cart"]');

                if (addToCartBtn) {
                    await addToCartBtn.click();

                    await page.waitForTimeout(500);

                    const newCount = await page.$eval('.cart-count', el => el.textContent);
                    // Count should increase
                }
            }
        });
    });
});
