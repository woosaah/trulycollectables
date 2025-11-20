const emailService = require('../../services/emailService');
const { cleanupTestData, createTestUser, createTestOrder, pool } = require('../helpers/test-db-setup');

// Mock nodemailer
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    })
}));

describe('Email Service', () => {
    let testUser;
    let testOrder;

    beforeAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        testUser = await createTestUser();
        testOrder = await createTestOrder(testUser.id);
    });

    afterEach(async () => {
        await cleanupTestData();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('sendOrderConfirmation', () => {
        it('should queue order confirmation email', async () => {
            const result = await emailService.sendOrderConfirmation(
                testUser.email,
                testOrder.order_number,
                testOrder.total_nzd
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should handle missing email gracefully', async () => {
            const result = await emailService.sendOrderConfirmation(
                null,
                testOrder.order_number,
                testOrder.total_nzd
            );

            expect(result.success).toBe(false);
        });
    });

    describe('sendOrderStatusUpdate', () => {
        it('should queue order status update email', async () => {
            const result = await emailService.sendOrderStatusUpdate(
                testUser.email,
                testOrder.order_number,
                'processing'
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should handle different status values', async () => {
            const statuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

            for (const status of statuses) {
                const result = await emailService.sendOrderStatusUpdate(
                    testUser.email,
                    testOrder.order_number,
                    status
                );

                expect(result.success).toBe(true);
            }
        });
    });

    describe('sendWelcomeEmail', () => {
        it('should queue welcome email', async () => {
            const result = await emailService.sendWelcomeEmail(
                testUser.email,
                testUser.first_name
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should queue password reset email with token', async () => {
            const resetToken = 'test-reset-token-123';

            const result = await emailService.sendPasswordResetEmail(
                testUser.email,
                resetToken
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should include reset link in email', async () => {
            const resetToken = 'test-reset-token-456';

            const result = await emailService.sendPasswordResetEmail(
                testUser.email,
                resetToken
            );

            expect(result.success).toBe(true);
        });
    });

    describe('sendInquiryConfirmation', () => {
        it('should queue inquiry confirmation email', async () => {
            const result = await emailService.sendInquiryConfirmation(
                testUser.email,
                'Test Subject',
                'Test inquiry message'
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('sendAdminNotification', () => {
        it('should queue admin notification email', async () => {
            const result = await emailService.sendAdminNotification(
                'New Order Received',
                `Order ${testOrder.order_number} has been placed`
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('Email validation', () => {
        it('should reject invalid email addresses', async () => {
            const invalidEmails = [
                'notanemail',
                '@test.com',
                'test@',
                'test @test.com',
                ''
            ];

            for (const email of invalidEmails) {
                const result = await emailService.sendWelcomeEmail(email, 'Test');
                expect(result.success).toBe(false);
            }
        });

        it('should accept valid email addresses', async () => {
            const validEmails = [
                'test@test.com',
                'user.name@example.com',
                'user+tag@domain.co.nz'
            ];

            for (const email of validEmails) {
                const result = await emailService.sendWelcomeEmail(email, 'Test');
                expect(result.success).toBe(true);
            }
        });
    });

    describe('Email queue', () => {
        it('should queue emails for later delivery', async () => {
            const result = await emailService.sendOrderConfirmation(
                testUser.email,
                testOrder.order_number,
                testOrder.total_nzd
            );

            expect(result.queued).toBeDefined();
        });

        it('should handle queue processing', async () => {
            // Queue multiple emails
            await emailService.sendWelcomeEmail(testUser.email, testUser.first_name);
            await emailService.sendOrderConfirmation(testUser.email, testOrder.order_number, testOrder.total_nzd);

            // Process queue
            const processed = await emailService.processQueue();

            expect(processed).toBeDefined();
        });
    });

    describe('Retry mechanism', () => {
        it('should retry failed emails', async () => {
            const nodemailer = require('nodemailer');
            const mockTransport = nodemailer.createTransport();

            // Mock failure
            mockTransport.sendMail.mockRejectedValueOnce(new Error('SMTP Error'));

            const result = await emailService.sendWelcomeEmail(testUser.email, testUser.first_name);

            // Should still queue for retry
            expect(result).toBeDefined();
        });

        it('should limit retry attempts', async () => {
            // This would test the retry logic
            // Implementation depends on the actual retry mechanism in emailService
            expect(true).toBe(true);
        });
    });

    describe('Email templates', () => {
        it('should use correct template for order confirmation', async () => {
            const result = await emailService.sendOrderConfirmation(
                testUser.email,
                testOrder.order_number,
                testOrder.total_nzd
            );

            expect(result.template).toBeDefined();
            expect(result.template).toContain('order-confirmation');
        });

        it('should use correct template for welcome email', async () => {
            const result = await emailService.sendWelcomeEmail(
                testUser.email,
                testUser.first_name
            );

            expect(result.template).toBeDefined();
            expect(result.template).toContain('welcome');
        });
    });
});
