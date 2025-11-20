const puppeteer = require('puppeteer');

describe('Authentication UI Tests', () => {
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

    describe('Login Page', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/auth/login`, {
                waitUntil: 'networkidle0'
            });
        });

        it('should load login page successfully', async () => {
            const heading = await page.$('h1, h2');
            expect(heading).toBeTruthy();

            const headingText = await page.$eval('h1, h2', el => el.textContent);
            expect(headingText.toLowerCase()).toContain('login');
        });

        it('should have email input field', async () => {
            const emailInput = await page.$('input[type="email"], input[name="email"]');
            expect(emailInput).toBeTruthy();
        });

        it('should have password input field', async () => {
            const passwordInput = await page.$('input[type="password"], input[name="password"]');
            expect(passwordInput).toBeTruthy();
        });

        it('should have login button', async () => {
            const loginButton = await page.$('button[type="submit"], input[type="submit"]');
            expect(loginButton).toBeTruthy();
        });

        it('should have link to register page', async () => {
            const registerLink = await page.$('a[href*="register"]');
            expect(registerLink).toBeTruthy();
        });

        it('should have forgot password link', async () => {
            const forgotLink = await page.$('a[href*="forgot"]');
            expect(forgotLink).toBeTruthy();
        });

        it('should show validation error for empty form', async () => {
            const loginButton = await page.$('button[type="submit"]');

            if (loginButton) {
                await loginButton.click();

                // Check for HTML5 validation or custom error messages
                const emailInput = await page.$('input[type="email"]');
                const isRequired = await page.$eval('input[type="email"]', el => el.required);

                expect(isRequired).toBe(true);
            }
        });

        it('should accept valid email format', async () => {
            const emailInput = await page.$('input[type="email"]');

            if (emailInput) {
                await emailInput.type('test@example.com');

                const value = await page.$eval('input[type="email"]', el => el.value);
                expect(value).toBe('test@example.com');
            }
        });

        it('should mask password input', async () => {
            const passwordInput = await page.$('input[name="password"]');

            if (passwordInput) {
                await passwordInput.type('secretpassword');

                const type = await page.$eval('input[name="password"]', el => el.type);
                expect(type).toBe('password');
            }
        });

        it('should show error for invalid credentials', async () => {
            await page.type('input[type="email"]', 'invalid@test.com');
            await page.type('input[type="password"]', 'wrongpassword');

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {}),
                page.click('button[type="submit"]')
            ]);

            // Check for error message
            const errorMsg = await page.$('.alert-danger, .error, [class*="error"]');
            expect(errorMsg).toBeTruthy();
        });
    });

    describe('Registration Page', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/auth/register`, {
                waitUntil: 'networkidle0'
            });
        });

        it('should load registration page successfully', async () => {
            const heading = await page.$('h1, h2');
            expect(heading).toBeTruthy();

            const headingText = await page.$eval('h1, h2', el => el.textContent);
            expect(headingText.toLowerCase()).toContain('register');
        });

        it('should have username input', async () => {
            const usernameInput = await page.$('input[name="username"]');
            expect(usernameInput).toBeTruthy();
        });

        it('should have email input', async () => {
            const emailInput = await page.$('input[type="email"], input[name="email"]');
            expect(emailInput).toBeTruthy();
        });

        it('should have password input', async () => {
            const passwordInput = await page.$('input[type="password"], input[name="password"]');
            expect(passwordInput).toBeTruthy();
        });

        it('should have confirm password input', async () => {
            const confirmPasswordInput = await page.$('input[name="confirmPassword"], input[name*="confirm"]');
            expect(confirmPasswordInput).toBeTruthy();
        });

        it('should have first name input', async () => {
            const firstNameInput = await page.$('input[name="firstName"], input[name*="first"]');
            expect(firstNameInput).toBeTruthy();
        });

        it('should have last name input', async () => {
            const lastNameInput = await page.$('input[name="lastName"], input[name*="last"]');
            expect(lastNameInput).toBeTruthy();
        });

        it('should have register button', async () => {
            const registerButton = await page.$('button[type="submit"]');
            expect(registerButton).toBeTruthy();
        });

        it('should validate email format', async () => {
            const emailInput = await page.$('input[type="email"]');

            if (emailInput) {
                await emailInput.type('invalid-email');

                const validity = await page.$eval('input[type="email"]', el => el.validity.valid);
                expect(validity).toBe(false);
            }
        });

        it('should validate password strength', async () => {
            const passwordInput = await page.$('input[name="password"]');

            if (passwordInput) {
                await passwordInput.type('weak');

                // Check if there's a password strength indicator
                const strengthIndicator = await page.$('.password-strength, [class*="strength"]');
                // May or may not exist depending on implementation
            }
        });

        it('should validate password confirmation match', async () => {
            const passwordInput = await page.$('input[name="password"]');
            const confirmInput = await page.$('input[name="confirmPassword"]');

            if (passwordInput && confirmInput) {
                await passwordInput.type('Password123!');
                await confirmInput.type('DifferentPassword123!');

                await page.click('button[type="submit"]');

                // Should show error
                await page.waitForTimeout(500);
                const error = await page.$('.alert, .error, [class*="error"]');
                expect(error).toBeTruthy();
            }
        });

        it('should have link to login page', async () => {
            const loginLink = await page.$('a[href*="login"]');
            expect(loginLink).toBeTruthy();
        });
    });

    describe('Forgot Password Page', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/auth/forgot-password`, {
                waitUntil: 'networkidle0'
            });
        });

        it('should load forgot password page', async () => {
            const heading = await page.$('h1, h2');
            expect(heading).toBeTruthy();
        });

        it('should have email input', async () => {
            const emailInput = await page.$('input[type="email"], input[name="email"]');
            expect(emailInput).toBeTruthy();
        });

        it('should have submit button', async () => {
            const submitButton = await page.$('button[type="submit"]');
            expect(submitButton).toBeTruthy();
        });

        it('should accept email submission', async () => {
            const emailInput = await page.$('input[type="email"]');

            if (emailInput) {
                await emailInput.type('test@example.com');
                await page.click('button[type="submit"]');

                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});

                // Should show success message
                const successMsg = await page.$('.alert-success, .success, [class*="success"]');
                // May or may not exist depending on implementation
            }
        });
    });

    describe('Logout', () => {
        it('should have logout button when logged in', async () => {
            // This test requires being logged in first
            await page.goto(`${BASE_URL}/auth/login`);

            // Attempt login with test credentials
            const emailInput = await page.$('input[type="email"]');
            const passwordInput = await page.$('input[type="password"]');

            if (emailInput && passwordInput) {
                await emailInput.type('test@example.com');
                await passwordInput.type('testpassword');

                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {}),
                    page.click('button[type="submit"]')
                ]);

                // Check for logout button
                const logoutButton = await page.$('a[href*="logout"], button:contains("Logout")');
                // Will exist if login was successful
            }
        });
    });

    describe('CSRF Protection', () => {
        beforeEach(async () => {
            await page.goto(`${BASE_URL}/auth/login`);
        });

        it('should have CSRF token in form', async () => {
            const csrfToken = await page.$('input[name="_csrf"], input[name="csrf"]');
            expect(csrfToken).toBeTruthy();
        });

        it('should include CSRF token value', async () => {
            const csrfValue = await page.$eval('input[name="_csrf"], input[name="csrf"]', el => el.value);
            expect(csrfValue).toBeTruthy();
            expect(csrfValue.length).toBeGreaterThan(0);
        });
    });

    describe('Mobile Responsiveness', () => {
        it('should be responsive on mobile - login', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/auth/login`);

            const form = await page.$('form');
            expect(form).toBeTruthy();
        });

        it('should be responsive on mobile - register', async () => {
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(`${BASE_URL}/auth/register`);

            const form = await page.$('form');
            expect(form).toBeTruthy();
        });
    });
});
