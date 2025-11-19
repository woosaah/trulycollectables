const nodemailer = require('nodemailer');
const pool = require('../config/database');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            } : null,
            // For development without SMTP server
            ...(process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST ? {
                streamTransport: true,
                newline: 'unix',
                buffer: true
            } : {})
        });
    }

    async queueEmail(recipient, subject, body, templateName = null, templateData = null) {
        const query = `
            INSERT INTO email_queue (recipient_email, subject, body, template_name, template_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        const result = await pool.query(query, [
            recipient,
            subject,
            body,
            templateName,
            templateData ? JSON.stringify(templateData) : null
        ]);
        return result.rows[0].id;
    }

    async sendEmail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || 'noreply@trulycollectables.co.nz',
                to,
                subject,
                html
            });

            console.log('Email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Email error:', error);
            return false;
        }
    }

    // Email Templates
    orderConfirmationTemplate(order, orderItems) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; }
                    .header { background: #6495ED; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
                    .total { font-size: 1.2em; font-weight: bold; color: #6495ED; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Order Confirmation</h1>
                </div>
                <div class="content">
                    <p>Dear ${order.customer_name},</p>
                    <p>Thank you for your order! We've received your order and will process it shortly.</p>

                    <div class="order-details">
                        <h2>Order #${order.order_number}</h2>
                        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                        <p><strong>Email:</strong> ${order.customer_email}</p>

                        <h3>Items:</h3>
                        ${orderItems.map(item => `
                            <div class="item">
                                <strong>${item.card_name || item.product_name}</strong><br>
                                ${item.set_name ? `<em>${item.set_name}</em><br>` : ''}
                                Quantity: ${item.quantity} × NZD $${item.price_nzd.toFixed(2)} = NZD $${(item.quantity * item.price_nzd).toFixed(2)}
                            </div>
                        `).join('')}

                        ${order.discount_amount > 0 ? `
                            <div style="margin-top: 15px;">
                                <p><strong>Subtotal:</strong> NZD $${order.subtotal_nzd.toFixed(2)}</p>
                                <p><strong>Discount:</strong> -NZD $${order.discount_amount.toFixed(2)}</p>
                            </div>
                        ` : ''}

                        <p class="total">Total: NZD $${order.total_nzd.toFixed(2)}</p>
                    </div>

                    <div class="order-details">
                        <h3>Shipping Address:</h3>
                        <p>${order.shipping_address.replace(/\n/g, '<br>')}</p>
                    </div>

                    ${order.notes ? `
                        <div class="order-details">
                            <h3>Order Notes:</h3>
                            <p>${order.notes}</p>
                        </div>
                    ` : ''}

                    <p>We'll send you payment instructions shortly. If you have any questions, please don't hesitate to contact us.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} TrulyCollectables. All rights reserved.</p>
                    <p>trulycollectables.co.nz</p>
                </div>
            </body>
            </html>
        `;
    }

    orderStatusUpdateTemplate(order, newStatus) {
        const statusMessages = {
            processing: 'Your order is now being processed.',
            shipped: 'Great news! Your order has been shipped.',
            completed: 'Your order has been completed. Thank you for shopping with us!',
            cancelled: 'Your order has been cancelled.'
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; }
                    .header { background: #6495ED; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .status { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Order Status Update</h1>
                </div>
                <div class="content">
                    <p>Dear ${order.customer_name},</p>

                    <div class="status">
                        <h2>Order #${order.order_number}</h2>
                        <p style="font-size: 1.2em; color: #6495ED;"><strong>${statusMessages[newStatus] || 'Your order status has been updated.'}</strong></p>
                        <p>Current Status: <strong>${newStatus.toUpperCase()}</strong></p>
                    </div>

                    <p>You can view your order details anytime by logging into your account.</p>

                    <p>Thank you for choosing TrulyCollectables!</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} TrulyCollectables. All rights reserved.</p>
                    <p>trulycollectables.co.nz</p>
                </div>
            </body>
            </html>
        `;
    }

    passwordResetTemplate(username, resetLink) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; }
                    .header { background: #6495ED; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .button { display: inline-block; background: #6495ED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello ${username},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>

                    <p style="text-align: center;">
                        <a href="${resetLink}" class="button">Reset Password</a>
                    </p>

                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #6495ED;">${resetLink}</p>

                    <div class="warning">
                        <p><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} TrulyCollectables. All rights reserved.</p>
                    <p>trulycollectables.co.nz</p>
                </div>
            </body>
            </html>
        `;
    }

    welcomeEmailTemplate(username) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; }
                    .header { background: #6495ED; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .features { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .feature-item { margin: 10px 0; }
                    .button { display: inline-block; background: #6495ED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to TrulyCollectables!</h1>
                </div>
                <div class="content">
                    <p>Hi ${username},</p>
                    <p>Thank you for joining TrulyCollectables! We're excited to have you as part of our community.</p>

                    <div class="features">
                        <h3>What you can do:</h3>
                        <div class="feature-item">📦 Browse thousands of trading cards and collectibles</div>
                        <div class="feature-item">💝 Create and manage your personal collection</div>
                        <div class="feature-item">🔍 Use our collection matcher to find cards you want</div>
                        <div class="feature-item">🛒 Easy checkout and order tracking</div>
                        <div class="feature-item">⭐ Review products and share your experience</div>
                    </div>

                    <p style="text-align: center;">
                        <a href="${process.env.BASE_URL || 'http://localhost:3000'}/cards" class="button">Start Browsing</a>
                    </p>

                    <p>If you have any questions, feel free to reach out to us anytime!</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} TrulyCollectables. All rights reserved.</p>
                    <p>trulycollectables.co.nz</p>
                </div>
            </body>
            </html>
        `;
    }

    // Send specific email types
    async sendOrderConfirmation(order, orderItems) {
        const html = this.orderConfirmationTemplate(order, orderItems);
        await this.queueEmail(order.customer_email, `Order Confirmation - ${order.order_number}`, html, 'order_confirmation', { order, orderItems });
        return this.sendEmail(order.customer_email, `Order Confirmation - ${order.order_number}`, html);
    }

    async sendOrderStatusUpdate(order, newStatus) {
        const html = this.orderStatusUpdateTemplate(order, newStatus);
        await this.queueEmail(order.customer_email, `Order Status Update - ${order.order_number}`, html, 'order_status_update', { order, newStatus });
        return this.sendEmail(order.customer_email, `Order Status Update - ${order.order_number}`, html);
    }

    async sendPasswordReset(user, resetLink) {
        const html = this.passwordResetTemplate(user.username, resetLink);
        await this.queueEmail(user.email, 'Password Reset Request', html, 'password_reset', { user, resetLink });
        return this.sendEmail(user.email, 'Password Reset Request', html);
    }

    async sendWelcomeEmail(user) {
        const html = this.welcomeEmailTemplate(user.username);
        await this.queueEmail(user.email, 'Welcome to TrulyCollectables!', html, 'welcome', { user });
        return this.sendEmail(user.email, 'Welcome to TrulyCollectables!', html);
    }
}

module.exports = new EmailService();
