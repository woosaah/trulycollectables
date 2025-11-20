const User = require('../../models/User');
const { cleanupTestData, createTestUser, pool } = require('../helpers/test-db-setup');

describe('User Model', () => {
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
        it('should create a new user with valid data', async () => {
            const userData = {
                username: 'newuser' + Date.now(),
                email: 'newuser' + Date.now() + '@test.com',
                password: 'Password123!',
                firstName: 'New',
                lastName: 'User'
            };

            const user = await User.create(userData);

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
            expect(user.first_name).toBe(userData.firstName);
            expect(user.last_name).toBe(userData.lastName);
            expect(user.password_hash).toBeDefined();
            expect(user.password_hash).not.toBe(userData.password);
        });

        it('should not create user with duplicate email', async () => {
            const userData = {
                username: 'user1',
                email: 'duplicate@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'One'
            };

            await User.create(userData);

            const duplicateData = {
                username: 'user2',
                email: 'duplicate@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'Two'
            };

            await expect(User.create(duplicateData)).rejects.toThrow();
        });

        it('should not create user with duplicate username', async () => {
            const userData = {
                username: 'duplicateuser',
                email: 'user1@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'One'
            };

            await User.create(userData);

            const duplicateData = {
                username: 'duplicateuser',
                email: 'user2@test.com',
                password: 'Password123!',
                firstName: 'User',
                lastName: 'Two'
            };

            await expect(User.create(duplicateData)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const testUser = await createTestUser();
            const user = await User.findById(testUser.id);

            expect(user).toBeDefined();
            expect(user.id).toBe(testUser.id);
            expect(user.email).toBe(testUser.email);
        });

        it('should return null for non-existent id', async () => {
            const user = await User.findById(999999);
            expect(user).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const testUser = await createTestUser();
            const user = await User.findByEmail(testUser.email);

            expect(user).toBeDefined();
            expect(user.id).toBe(testUser.id);
            expect(user.email).toBe(testUser.email);
        });

        it('should return null for non-existent email', async () => {
            const user = await User.findByEmail('nonexistent@test.com');
            expect(user).toBeNull();
        });
    });

    describe('findByUsername', () => {
        it('should find user by username', async () => {
            const testUser = await createTestUser();
            const user = await User.findByUsername(testUser.username);

            expect(user).toBeDefined();
            expect(user.id).toBe(testUser.id);
            expect(user.username).toBe(testUser.username);
        });

        it('should return null for non-existent username', async () => {
            const user = await User.findByUsername('nonexistentuser');
            expect(user).toBeNull();
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const password = 'TestPassword123!';
            const userData = {
                username: 'passuser' + Date.now(),
                email: 'passuser' + Date.now() + '@test.com',
                password: password,
                firstName: 'Pass',
                lastName: 'User'
            };

            const user = await User.create(userData);
            const isValid = await User.verifyPassword(user.id, password);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'TestPassword123!';
            const userData = {
                username: 'passuser2' + Date.now(),
                email: 'passuser2' + Date.now() + '@test.com',
                password: password,
                firstName: 'Pass',
                lastName: 'User'
            };

            const user = await User.create(userData);
            const isValid = await User.verifyPassword(user.id, 'WrongPassword');

            expect(isValid).toBe(false);
        });
    });

    describe('update', () => {
        it('should update user fields', async () => {
            const testUser = await createTestUser();
            const updates = {
                first_name: 'Updated',
                last_name: 'Name'
            };

            const updated = await User.update(testUser.id, updates);

            expect(updated.first_name).toBe('Updated');
            expect(updated.last_name).toBe('Name');
        });

        it('should not update email to duplicate', async () => {
            const user1 = await createTestUser({ email: 'user1unique@test.com' });
            const user2 = await createTestUser({ email: 'user2unique@test.com' });

            await expect(
                User.update(user2.id, { email: 'user1unique@test.com' })
            ).rejects.toThrow();
        });
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            await createTestUser();
            await createTestUser();
            await createTestUser();

            const users = await User.findAll();

            expect(users).toBeDefined();
            expect(users.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('delete', () => {
        it('should delete user by id', async () => {
            const testUser = await createTestUser();
            await User.delete(testUser.id);

            const user = await User.findById(testUser.id);
            expect(user).toBeNull();
        });
    });
});
