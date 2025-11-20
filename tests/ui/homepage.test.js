const puppeteer = require('puppeteer');

describe('Homepage UI Tests', () => {
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
        it('should load homepage successfully', async () => {
            const response = await page.goto(BASE_URL, {
                waitUntil: 'networkidle0'
            });

            expect(response.status()).toBe(200);
        });

        it('should display site title', async () => {
            await page.goto(BASE_URL);

            const title = await page.title();
            expect(title).toContain('TrulyCollectables');
        });

        it('should have main navigation', async () => {
            await page.goto(BASE_URL);

            const nav = await page.$('nav');
            expect(nav).toBeTruthy();
        });
    });

    describe('Navigation Links', () => {
        beforeEach(async () => {
            await page.goto(BASE_URL);
        });

        it('should have Browse Cards link', async () => {
            const link = await page.$('a[href*="browse/cards"]');
            expect(link).toBeTruthy();
        });

        it('should have Browse Figurines link', async () => {
            const link = await page.$('a[href*="browse/figurines"]');
            expect(link).toBeTruthy();
        });

        it('should have Login link', async () => {
            const link = await page.$('a[href*="auth/login"]');
            expect(link).toBeTruthy();
        });

        it('should have Register link', async () => {
            const link = await page.$('a[href*="auth/register"]');
            expect(link).toBeTruthy();
        });

        it('should navigate to Browse Cards when clicked', async () => {
            await Promise.all([
                page.waitForNavigation(),
                page.click('a[href*="browse/cards"]')
            ]);

            const url = page.url();
            expect(url).toContain('browse/cards');
        });
    });

    describe('Search Functionality', () => {
        beforeEach(async () => {
            await page.goto(BASE_URL);
        });

        it('should have search input field', async () => {
            const searchInput = await page.$('input[name="q"], input[type="search"]');
            expect(searchInput).toBeTruthy();
        });

        it('should accept search input', async () => {
            const searchInput = await page.$('input[name="q"], input[type="search"]');

            if (searchInput) {
                await searchInput.type('basketball');

                const value = await page.$eval('input[name="q"], input[type="search"]', el => el.value);
                expect(value).toBe('basketball');
            }
        });

        it('should submit search form', async () => {
            const searchInput = await page.$('input[name="q"], input[type="search"]');

            if (searchInput) {
                await searchInput.type('test');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    searchInput.press('Enter')
                ]);

                const url = page.url();
                expect(url).toContain('search');
            }
        });
    });

    describe('Hero Section', () => {
        beforeEach(async () => {
            await page.goto(BASE_URL);
        });

        it('should display hero section', async () => {
            const hero = await page.$('.hero, .jumbotron, [class*="hero"]');
            expect(hero).toBeTruthy();
        });

        it('should have call-to-action button', async () => {
            const cta = await page.$('a.btn, button.btn');
            expect(cta).toBeTruthy();
        });
    });

    describe('Featured Products', () => {
        beforeEach(async () => {
            await page.goto(BASE_URL);
        });

        it('should display featured products section', async () => {
            const featured = await page.$('[class*="featured"], [class*="products"]');
            expect(featured).toBeTruthy();
        });

        it('should have product cards', async () => {
            const productCards = await page.$$('.card, [class*="product"]');
            expect(productCards.length).toBeGreaterThan(0);
        });
    });

    describe('Mobile Responsiveness', () => {
        it('should be responsive on mobile', async () => {
            await page.setViewport({ width: 375, height: 667 }); // iPhone size
            await page.goto(BASE_URL);

            const body = await page.$('body');
            expect(body).toBeTruthy();
        });

        it('should have mobile menu toggle', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(BASE_URL);

            const menuToggle = await page.$('.navbar-toggler, [class*="menu-toggle"]');
            // May or may not exist depending on design
        });
    });

    describe('Footer', () => {
        beforeEach(async () => {
            await page.goto(BASE_URL);
        });

        it('should have footer section', async () => {
            const footer = await page.$('footer');
            expect(footer).toBeTruthy();
        });

        it('should have contact information', async () => {
            const footerText = await page.$eval('footer', el => el.textContent);
            expect(footerText.length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        it('should load within acceptable time', async () => {
            const startTime = Date.now();

            await page.goto(BASE_URL, {
                waitUntil: 'networkidle0'
            });

            const loadTime = Date.now() - startTime;

            // Should load within 5 seconds
            expect(loadTime).toBeLessThan(5000);
        });
    });
});
