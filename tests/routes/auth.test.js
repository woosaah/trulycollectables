const request = require('supertest');
const app = require('../../server');
const { cleanupTestData, createTestUser, pool } = require('../helpers/test-db-setup');

describe('Auth Routes', () => {
    beforeAll(async () => {
        await cleanupTestData();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /auth/register', () => {
        it('should render registration page', async () => {
            const response = await request(app)
                .get('/auth/register');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Register');
        });
    });

    describe('POST /auth/register', () => {
        it('should register new user with valid data', async () => {
            const userData = {
                username: 'newuser' + Date.now(),
                email: 'newuser' + Date.now() + '@test.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'New',
                lastName: 'User'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(302); // Redirect after successful registration
            expect(response.header.location).toContain('/auth/login');
        });

        it('should reject registration with mismatched passwords', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@test.com',
                password: 'Password123!',
                confirmPassword: 'DifferentPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(400);
        });

        it('should reject registration with duplicate email', async () => {
            const email = 'duplicate' + Date.now() + '@test.com';

            await createTestUser({ email: email });

            const userData = {
                username: 'newuser' + Date.now(),
                email: email,
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(response.status).toBe(400);
        });
    });

    describe('GET /auth/login', () => {
        it('should render login page', async () => {
            const response = await request(app)
                .get('/auth/login');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Login');
        });
    });

    describe('POST /auth/login', () => {
        it('should login with valid credentials', async () => {
            const User = require('../../models/User');
            const password = 'TestPassword123!';

            const user = await User.create({
                username: 'logintest' + Date.now(),
                email: 'logintest' + Date.now() + '@test.com',
                password: password,
                firstName: 'Login',
                lastName: 'Test'
            });

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: password
                });

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/');
        });

        it('should reject login with invalid password', async () => {
            const User = require('../../models/User');

            const user = await User.create({
                username: 'failtest' + Date.now(),
                email: 'failtest' + Date.now() + '@test.com',
                password: 'CorrectPassword123!',
                firstName: 'Fail',
                lastName: 'Test'
            });

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: 'WrongPassword123!'
                });

            expect(response.status).toBe(401);
        });

        it('should reject login with non-existent email', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'Password123!'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout user', async () => {
            const response = await request(app)
                .post('/auth/logout');

            expect(response.status).toBe(302);
            expect(response.header.location).toBe('/');
        });
    });

    describe('GET /auth/forgot-password', () => {
        it('should render forgot password page', async () => {
            const response = await request(app)
                .get('/auth/forgot-password');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Forgot Password');
        });
    });

    describe('POST /auth/forgot-password', () => {
        it('should accept valid email for password reset', async () => {
            const user = await createTestUser();

            const response = await request(app)
                .post('/auth/forgot-password')
                .send({
                    email: user.email
                });

            expect(response.status).toBe(200);
        });

        it('should handle non-existent email gracefully', async () => {
            const response = await request(app)
                .post('/auth/forgot-password')
                .send({
                    email: 'nonexistent@test.com'
                });

            // Should still return 200 to prevent email enumeration
            expect(response.status).toBe(200);
        });
    });
});
