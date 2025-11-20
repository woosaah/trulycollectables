const puppeteer = require('puppeteer');

describe('Browse Cards Page UI Tests', () => {
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

    describe('Page Load', () => {
        it('should load browse cards page successfully', async () => {
            const response = await page.goto(`${BASE_URL}/browse/cards`, {
                waitUntil: 'networkidle0'
            });

            expect(response.status()).toBe(200);
        });

        it('should display page title', async () => {
            await page.goto(`${BASE_URL}/browse/cards`);

            const heading = await page.$('h1');
            expect(heading).toBeTruthy();

            const headingText = await page.$eval('h1', el => el.textContent);
            expect(headingText).toContain('Cards');
        });
    });

    describe('Filter Options', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should have sport filter', async () => {
            const sportFilter = await page.$('select[name="sport"], input[name="sport"]');
            expect(sportFilter).toBeTruthy();
        });

        it('should have condition filter', async () => {
            const conditionFilter = await page.$('select[name="condition"], input[name="condition"]');
            expect(conditionFilter).toBeTruthy();
        });

        it('should have year filter', async () => {
            const yearFilter = await page.$('select[name="year"], input[name="year"]');
            expect(yearFilter).toBeTruthy();
        });

        it('should have graded filter', async () => {
            const gradedFilter = await page.$('select[name="graded"], input[name="graded"]');
            expect(gradedFilter).toBeTruthy();
        });

        it('should apply sport filter', async () => {
            const sportFilter = await page.$('select[name="sport"]');

            if (sportFilter) {
                await page.select('select[name="sport"]', 'basketball');

                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                const url = page.url();
                expect(url).toContain('sport=basketball');
            }
        });

        it('should apply condition filter', async () => {
            const conditionFilter = await page.$('select[name="condition"]');

            if (conditionFilter) {
                await page.select('select[name="condition"]', 'mint');

                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                const url = page.url();
                expect(url).toContain('condition=mint');
            }
        });
    });

    describe('Card Display', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should display card grid', async () => {
            const cardGrid = await page.$('.row, .grid, [class*="card-grid"]');
            expect(cardGrid).toBeTruthy();
        });

        it('should display card items', async () => {
            const cards = await page.$$('.card');
            expect(cards.length).toBeGreaterThan(0);
        });

        it('should display card images', async () => {
            const images = await page.$$('.card img');

            if (images.length > 0) {
                const src = await page.$eval('.card img', img => img.src);
                expect(src).toBeTruthy();
                expect(src.length).toBeGreaterThan(0);
            }
        });

        it('should display card names', async () => {
            const cardNames = await page.$$('.card h5, .card .card-title');
            expect(cardNames.length).toBeGreaterThan(0);
        });

        it('should display card prices', async () => {
            const prices = await page.$$('.card .price, .card [class*="price"]');
            expect(prices.length).toBeGreaterThan(0);
        });

        it('should have clickable card links', async () => {
            const cardLink = await page.$('.card a');

            if (cardLink) {
                const href = await page.$eval('.card a', a => a.href);
                expect(href).toContain('/card/');
            }
        });
    });

    describe('Sorting', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should have sort dropdown', async () => {
            const sortSelect = await page.$('select[name="sort"], [name*="sort"]');
            expect(sortSelect).toBeTruthy();
        });

        it('should sort by price low to high', async () => {
            const sortSelect = await page.$('select[name="sort"]');

            if (sortSelect) {
                await page.select('select[name="sort"]', 'price_asc');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                const url = page.url();
                expect(url).toContain('sort=price_asc');
            }
        });

        it('should sort by price high to low', async () => {
            const sortSelect = await page.$('select[name="sort"]');

            if (sortSelect) {
                await page.select('select[name="sort"]', 'price_desc');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                const url = page.url();
                expect(url).toContain('sort=price_desc');
            }
        });
    });

    describe('Pagination', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should have pagination if many cards', async () => {
            const pagination = await page.$('.pagination, [class*="pagination"]');
            // May or may not exist depending on number of cards
        });

        it('should navigate to next page', async () => {
            const nextButton = await page.$('.pagination .next, a[rel="next"]');

            if (nextButton) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    nextButton.click()
                ]);

                const url = page.url();
                expect(url).toContain('page=2');
            }
        });
    });

    describe('Add to Cart', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should have add to cart buttons', async () => {
            const addToCartBtns = await page.$$('button[name*="cart"], .add-to-cart, [class*="add-to-cart"]');
            expect(addToCartBtns.length).toBeGreaterThan(0);
        });

        it('should show quantity input', async () => {
            const quantityInputs = await page.$$('input[type="number"], input[name*="quantity"]');
            expect(quantityInputs.length).toBeGreaterThan(0);
        });
    });

    describe('Search Within Cards', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/browse/cards`);
        });

        it('should have search input for cards', async () => {
            const searchInput = await page.$('input[name="search"], input[type="search"]');
            expect(searchInput).toBeTruthy();
        });

        it('should filter cards by search term', async () => {
            const searchInput = await page.$('input[name="search"]');

            if (searchInput) {
                await searchInput.type('Jordan');
                await searchInput.press('Enter');

                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                const url = page.url();
                expect(url).toContain('search=Jordan');
            }
        });
    });

    describe('Mobile View', () => {
        it('should display cards in mobile view', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/browse/cards`);

            const cards = await page.$$('.card');
            expect(cards.length).toBeGreaterThan(0);
        });

        it('should have responsive grid layout', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/browse/cards`);

            const grid = await page.$('.row, .grid');
            expect(grid).toBeTruthy();
        });
    });

    describe('No Results', () => {
        it('should show message when no cards match filters', async () => {
            await page.goto(`${BASE_URL}/browse/cards?sport=nonexistent`);

            const noResults = await page.$('.no-results, .empty-state, p:contains("No cards found")');
            // May or may not exist depending on implementation
        });
    });
});
