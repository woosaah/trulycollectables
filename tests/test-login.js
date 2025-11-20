const puppeteer = require('puppeteer');

async function testLogin() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Navigate to the site
        console.log('Navigating to http://localhost:3010...');
        await page.goto('http://localhost:3010', { waitUntil: 'networkidle2' });

        // Take a screenshot of the homepage
        await page.screenshot({ path: 'homepage.png' });
        console.log('✓ Homepage loaded - screenshot saved as homepage.png');

        // Click on Login link
        console.log('Looking for login link...');
        await page.waitForSelector('a[href="/auth/login"]', { timeout: 5000 });
        await page.click('a[href="/auth/login"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('✓ Login page loaded');
        await page.screenshot({ path: 'login-page.png' });

        // Fill in login form
        console.log('Filling in login form...');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', 'testuser');
        await page.type('input[name="password"]', 'testpassword');

        await page.screenshot({ path: 'login-form-filled.png' });

        // Submit the form
        console.log('Submitting login form...');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Check if login was successful or failed
        const url = page.url();
        console.log('Current URL after login:', url);

        await page.screenshot({ path: 'after-login.png' });

        if (url.includes('/user/') || url === 'http://localhost:3010/') {
            console.log('✓ Login appears successful (redirected)');
        } else if (url.includes('/auth/login')) {
            console.log('✗ Login failed - still on login page');

            // Check for error messages
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('Page content:', bodyText.substring(0, 200));
        }

        console.log('\n✓ Test completed');
        console.log('Screenshots saved:');
        console.log('  - homepage.png');
        console.log('  - login-page.png');
        console.log('  - login-form-filled.png');
        console.log('  - after-login.png');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        await page.screenshot({ path: 'error.png' });
        console.log('Error screenshot saved as error.png');
    } finally {
        await browser.close();
    }
}

testLogin();
