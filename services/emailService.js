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

        this.fromAddress = process.env.EMAIL_FROM || 'Truly Collectables <noreply@trulycollectables.co.nz>';
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3010';
    }

    async queueEmail(recipient, subject, body, templateName = null, templateData = null) {
        try {
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
        } catch (error) {
            console.error('Email queue error:', error);
        }
    }

    async sendEmail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to,
                subject,
                html
            });

            if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
                console.log('Email preview (dev mode) - To:', to, '- Subject:', subject);
            } else {
                console.log('Email sent:', info.messageId, 'to:', to);
            }
            return true;
        } catch (error) {
            console.error('Email send error:', error.message);
            return false;
        }
    }

    // Shared base layout
    _baseLayout(content) {
        const year = new Date().getFullYear();
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Truly Collectables</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
        <tr>
            <td align="center" style="padding: 24px 0;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 32px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Truly Collectables</h1>
                            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;">Cards &bull; Collectables &bull; Accessories</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 8px; color: #6c757d; font-size: 13px;">
                                            Questions? Reply to this email or contact us at
                                            <a href="mailto:info@trulycollectables.co.nz" style="color: #0f3460; text-decoration: none;">info@trulycollectables.co.nz</a>
                                        </p>
                                        <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                                            &copy; ${year} Truly Collectables Ltd. All rights reserved.<br>
                                            New Zealand
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    // Helper: format item name with variant
    _formatItemName(item) {
        let name = item.card_name || item.figurine_name || item.accessory_name || 'Item';
        if (item.variant_label) {
            name += ` — ${item.variant_label}`;
        }
        if (item.set_name) {
            name += `<br><span style="color: #6c757d; font-size: 13px;">${item.set_name}</span>`;
        }
        if (item.accessory_category) {
            name += `<br><span style="color: #6c757d; font-size: 13px;">${item.accessory_category}</span>`;
        }
        return name;
    }

    // Helper: status badge color
    _statusColor(status) {
        const colors = {
            pending: { bg: '#fff3cd', text: '#856404', border: '#ffc107' },
            processing: { bg: '#cce5ff', text: '#004085', border: '#007bff' },
            shipped: { bg: '#d4edda', text: '#155724', border: '#28a745' },
            completed: { bg: '#d4edda', text: '#155724', border: '#28a745' },
            cancelled: { bg: '#f8d7da', text: '#721c24', border: '#dc3545' },
            ready_for_pickup: { bg: '#d1ecf1', text: '#0c5460', border: '#17a2b8' }
        };
        return colors[status] || colors.pending;
    }

    // =====================
    // EMAIL TEMPLATES
    // =====================

    orderConfirmationTemplate(order, orderItems, bankDetails = null) {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-NZ', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const subtotal = parseFloat(order.subtotal_nzd || order.total_nzd);
        const discount = parseFloat(order.discount_amount || 0);
        const total = parseFloat(order.total_nzd);

        let itemsHtml = orderItems.map((item, i) => {
            const price = parseFloat(item.price_nzd);
            const lineTotal = price * item.quantity;
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
            return `
                <tr style="background-color: ${bgColor};">
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef; font-size: 14px;">
                        ${this._formatItemName(item)}
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 14px; color: #495057;">
                        ${item.quantity}
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 14px; color: #495057;">
                        $${price.toFixed(2)}
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 14px; font-weight: 600;">
                        $${lineTotal.toFixed(2)}
                    </td>
                </tr>`;
        }).join('');

        const shipping = parseFloat(order.shipping_cost || 0);

        let totalsHtml = '';
        if (discount > 0 || shipping > 0) {
            totalsHtml += `
                <tr>
                    <td colspan="3" style="padding: 8px 16px; text-align: right; font-size: 14px; color: #6c757d;">Subtotal</td>
                    <td style="padding: 8px 16px; text-align: right; font-size: 14px;">$${subtotal.toFixed(2)}</td>
                </tr>`;
            if (discount > 0) {
                totalsHtml += `
                <tr>
                    <td colspan="3" style="padding: 8px 16px; text-align: right; font-size: 14px; color: #28a745;">Discount</td>
                    <td style="padding: 8px 16px; text-align: right; font-size: 14px; color: #28a745;">-$${discount.toFixed(2)}</td>
                </tr>`;
            }
            if (shipping > 0) {
                totalsHtml += `
                <tr>
                    <td colspan="3" style="padding: 8px 16px; text-align: right; font-size: 14px; color: #6c757d;">Shipping</td>
                    <td style="padding: 8px 16px; text-align: right; font-size: 14px;">$${shipping.toFixed(2)}</td>
                </tr>`;
            }
        }

        const content = `
            <!-- Success icon -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; background-color: #d4edda; border-radius: 50%; line-height: 64px; font-size: 32px;">
                    &#10003;
                </div>
            </div>

            <h2 style="margin: 0 0 8px; text-align: center; color: #1a1a2e; font-size: 24px;">Order Confirmed!</h2>
            <p style="margin: 0 0 32px; text-align: center; color: #6c757d; font-size: 15px;">
                Thank you for your order, ${order.customer_name}.
            </p>

            <!-- Order number banner -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                    <td style="background-color: #f0f4ff; border: 1px solid #d6e0f0; border-radius: 8px; padding: 16px; text-align: center;">
                        <span style="font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Order Number</span><br>
                        <span style="font-size: 22px; font-weight: 700; color: #0f3460; letter-spacing: 1px;">${order.order_number}</span><br>
                        <span style="font-size: 13px; color: #6c757d;">${orderDate}</span>
                    </td>
                </tr>
            </table>

            <!-- Items table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <tr style="background-color: #1a1a2e;">
                    <td style="padding: 12px 16px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Item</td>
                    <td style="padding: 12px 16px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</td>
                    <td style="padding: 12px 16px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Price</td>
                    <td style="padding: 12px 16px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Total</td>
                </tr>
                ${itemsHtml}
                ${totalsHtml}
                <tr style="background-color: #f0f4ff;">
                    <td colspan="3" style="padding: 14px 16px; text-align: right; font-size: 16px; font-weight: 700; color: #1a1a2e;">Total (NZD)</td>
                    <td style="padding: 14px 16px; text-align: right; font-size: 18px; font-weight: 700; color: #0f3460;">$${total.toFixed(2)}</td>
                </tr>
            </table>

            <!-- Shipping & Payment info -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                    <td width="50%" style="padding-right: 8px; vertical-align: top;">
                        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; height: 100%;">
                            <h4 style="margin: 0 0 8px; font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Shipping Address</h4>
                            <p style="margin: 0; font-size: 14px; color: #212529; line-height: 1.6;">${order.shipping_address.replace(/\n/g, '<br>')}</p>
                        </div>
                    </td>
                    <td width="50%" style="padding-left: 8px; vertical-align: top;">
                        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; height: 100%;">
                            <h4 style="margin: 0 0 8px; font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Contact Details</h4>
                            <p style="margin: 0; font-size: 14px; color: #212529; line-height: 1.6;">
                                ${order.customer_name}<br>
                                ${order.customer_email}
                            </p>
                        </div>
                    </td>
                </tr>
            </table>

            ${order.notes ? `
            <div style="background-color: #fff3cd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; font-size: 13px; color: #856404; text-transform: uppercase; letter-spacing: 1px;">Order Notes</h4>
                <p style="margin: 0; font-size: 14px; color: #856404;">${order.notes}</p>
            </div>
            ` : ''}

            ${bankDetails && bankDetails.bank_account_number ? `
            <!-- Bank Transfer Details -->
            <div style="background-color: #f0f4ff; border: 2px solid #0f3460; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px; font-size: 16px; color: #0f3460;">&#127974; Payment — Bank Transfer</h4>
                <p style="margin: 0 0 12px; font-size: 14px; color: #495057;">Please make payment to:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 6px; border: 1px solid #e9ecef;">
                    ${bankDetails.bank_name ? `<tr><td style="padding: 8px 16px; font-size: 14px; color: #6c757d; border-bottom: 1px solid #f0f0f0;">Bank</td><td style="padding: 8px 16px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${bankDetails.bank_name}</td></tr>` : ''}
                    ${bankDetails.bank_account_name ? `<tr><td style="padding: 8px 16px; font-size: 14px; color: #6c757d; border-bottom: 1px solid #f0f0f0;">Account Name</td><td style="padding: 8px 16px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${bankDetails.bank_account_name}</td></tr>` : ''}
                    <tr><td style="padding: 8px 16px; font-size: 14px; color: #6c757d; border-bottom: 1px solid #f0f0f0;">Account Number</td><td style="padding: 8px 16px; font-size: 16px; font-weight: 700; color: #0f3460; border-bottom: 1px solid #f0f0f0;">${bankDetails.bank_account_number}</td></tr>
                    <tr><td style="padding: 8px 16px; font-size: 14px; color: #6c757d; border-bottom: 1px solid #f0f0f0;">Amount</td><td style="padding: 8px 16px; font-size: 16px; font-weight: 700; color: #0f3460; border-bottom: 1px solid #f0f0f0;">$${total.toFixed(2)} NZD</td></tr>
                    <tr><td style="padding: 8px 16px; font-size: 14px; color: #6c757d;">Reference</td><td style="padding: 8px 16px; font-size: 16px; font-weight: 700; color: #0f3460;">${order.order_number}</td></tr>
                </table>
                ${bankDetails.bank_reference_instructions ? `<p style="margin: 12px 0 0; font-size: 13px; color: #6c757d;"><em>${bankDetails.bank_reference_instructions}</em></p>` : ''}
            </div>
            ` : ''}

            <!-- Next steps -->
            <div style="background-color: #e8f4fd; border-left: 4px solid #0f3460; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; font-size: 15px; color: #0f3460;">What happens next?</h4>
                <ol style="margin: 0; padding-left: 20px; color: #495057; font-size: 14px; line-height: 1.8;">
                    <li>Make payment using the bank details above</li>
                    <li>Once payment is confirmed, we'll prepare your order</li>
                    <li>You'll receive tracking info when your order ships</li>
                </ol>
            </div>

            <!-- View order button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center;">
                        <a href="${this.baseUrl}/user/orders/${order.id}" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            View Order Details
                        </a>
                    </td>
                </tr>
            </table>
        `;

        return this._baseLayout(content);
    }

    orderStatusUpdateTemplate(order, newStatus) {
        const sc = this._statusColor(newStatus);

        const statusMessages = {
            pending: 'Your order is awaiting processing.',
            processing: 'Great news! Your order is now being prepared.',
            shipped: 'Your order is on its way!',
            ready_for_pickup: 'Your order is ready for pickup!',
            completed: 'Your order has been completed. Thank you for shopping with us!',
            cancelled: 'Your order has been cancelled.'
        };

        const statusIcons = {
            pending: '&#9202;',
            processing: '&#9881;',
            shipped: '&#128230;',
            ready_for_pickup: '&#127974;',
            completed: '&#10003;',
            cancelled: '&#10007;'
        };

        const statusLabel = newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const content = `
            <h2 style="margin: 0 0 24px; text-align: center; color: #1a1a2e; font-size: 22px;">Order Status Update</h2>

            <!-- Status badge -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                    <td style="text-align: center;">
                        <div style="display: inline-block; background-color: ${sc.bg}; border: 2px solid ${sc.border}; border-radius: 12px; padding: 20px 40px;">
                            <span style="font-size: 36px;">${statusIcons[newStatus] || '&#128230;'}</span>
                            <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: ${sc.text};">${statusLabel}</p>
                        </div>
                    </td>
                </tr>
            </table>

            <p style="text-align: center; font-size: 15px; color: #495057; margin: 0 0 24px;">
                ${statusMessages[newStatus] || 'Your order status has been updated.'}
            </p>

            <!-- Order info -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 20px; text-align: center;">
                        <span style="font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Order Number</span><br>
                        <span style="font-size: 20px; font-weight: 700; color: #0f3460;">${order.order_number}</span><br>
                        <span style="font-size: 14px; color: #6c757d; margin-top: 4px;">Total: NZD $${parseFloat(order.total_nzd).toFixed(2)}</span>
                    </td>
                </tr>
            </table>

            ${newStatus === 'shipped' ? `
            <div style="background-color: #e8f4fd; border-left: 4px solid #0f3460; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #495057;">
                    We'll be in touch with tracking details if applicable. If you have any questions about delivery, just reply to this email.
                </p>
            </div>
            ` : ''}

            ${newStatus === 'ready_for_pickup' ? `
            <div style="background-color: #e8f4fd; border-left: 4px solid #0f3460; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #495057;">
                    Your order is ready to collect. We'll be in touch to arrange a pickup time that suits you.
                </p>
            </div>
            ` : ''}

            ${newStatus === 'cancelled' ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    If you believe this was a mistake or have questions, please reply to this email and we'll sort it out for you.
                </p>
            </div>
            ` : ''}

            <!-- View order button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center;">
                        <a href="${this.baseUrl}/user/orders/${order.id}" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            View Order Details
                        </a>
                    </td>
                </tr>
            </table>
        `;

        return this._baseLayout(content);
    }

    // Admin notification for new orders
    adminNewOrderTemplate(order, orderItems) {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-NZ', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const total = parseFloat(order.total_nzd);

        let itemsList = orderItems.map(item => {
            const price = parseFloat(item.price_nzd);
            return `<li style="padding: 4px 0; font-size: 14px;">${this._formatItemName(item)} &times; ${item.quantity} @ $${price.toFixed(2)}</li>`;
        }).join('');

        const content = `
            <h2 style="margin: 0 0 8px; color: #1a1a2e; font-size: 22px;">New Order Received</h2>
            <p style="margin: 0 0 24px; color: #6c757d; font-size: 14px;">${orderDate}</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #d4edda; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 20px; text-align: center;">
                        <span style="font-size: 13px; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Order</span><br>
                        <span style="font-size: 22px; font-weight: 700; color: #155724;">${order.order_number}</span><br>
                        <span style="font-size: 18px; font-weight: 600; color: #155724;">NZD $${total.toFixed(2)}</span>
                    </td>
                </tr>
            </table>

            <h4 style="margin: 0 0 8px; font-size: 14px; color: #6c757d; text-transform: uppercase;">Customer</h4>
            <p style="margin: 0 0 16px; font-size: 14px;">
                <strong>${order.customer_name}</strong><br>
                <a href="mailto:${order.customer_email}" style="color: #0f3460;">${order.customer_email}</a>
            </p>

            <h4 style="margin: 0 0 8px; font-size: 14px; color: #6c757d; text-transform: uppercase;">Items</h4>
            <ul style="margin: 0 0 16px; padding-left: 20px;">${itemsList}</ul>

            <h4 style="margin: 0 0 8px; font-size: 14px; color: #6c757d; text-transform: uppercase;">Shipping Address</h4>
            <p style="margin: 0 0 16px; font-size: 14px;">${order.shipping_address.replace(/\n/g, '<br>')}</p>

            ${order.notes ? `
            <h4 style="margin: 0 0 8px; font-size: 14px; color: #6c757d; text-transform: uppercase;">Customer Notes</h4>
            <p style="margin: 0 0 16px; font-size: 14px; background-color: #fff3cd; padding: 12px; border-radius: 6px;">${order.notes}</p>
            ` : ''}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center;">
                        <a href="${this.baseUrl}/admin/orders/${order.id}" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            Manage Order
                        </a>
                    </td>
                </tr>
            </table>
        `;

        return this._baseLayout(content);
    }

    passwordResetTemplate(username, resetLink) {
        const content = `
            <h2 style="margin: 0 0 24px; text-align: center; color: #1a1a2e; font-size: 22px;">Password Reset</h2>

            <p style="font-size: 15px; color: #495057; margin: 0 0 16px;">Hi ${username},</p>
            <p style="font-size: 15px; color: #495057; margin: 0 0 24px;">
                We received a request to reset your password. Click the button below to choose a new one.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                    <td style="text-align: center;">
                        <a href="${resetLink}" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            Reset Password
                        </a>
                    </td>
                </tr>
            </table>

            <p style="font-size: 13px; color: #6c757d; margin: 0 0 8px;">Or copy and paste this link:</p>
            <p style="font-size: 13px; color: #0f3460; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin: 0 0 24px;">${resetLink}</p>

            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0; padding: 16px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Security notice:</strong> This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        `;

        return this._baseLayout(content);
    }

    welcomeEmailTemplate(username) {
        const content = `
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">&#127881;</span>
            </div>

            <h2 style="margin: 0 0 8px; text-align: center; color: #1a1a2e; font-size: 24px;">Welcome aboard, ${username}!</h2>
            <p style="margin: 0 0 32px; text-align: center; color: #6c757d; font-size: 15px;">
                Your account is all set up and ready to go.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                    <td style="background-color: #f8f9fa; border-radius: 8px; padding: 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding: 8px 0; font-size: 15px; color: #495057;">
                                    <span style="margin-right: 8px;">&#128722;</span>
                                    <strong>Browse &amp; shop</strong> our range of card pages, sleeves, and accessories
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-size: 15px; color: #495057;">
                                    <span style="margin-right: 8px;">&#128220;</span>
                                    <strong>Track your collection</strong> with our built-in collection manager
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-size: 15px; color: #495057;">
                                    <span style="margin-right: 8px;">&#11088;</span>
                                    <strong>Society members</strong> get exclusive pricing on most products
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center;">
                        <a href="${this.baseUrl}/accessories" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            Start Browsing
                        </a>
                    </td>
                </tr>
            </table>
        `;

        return this._baseLayout(content);
    }

    // =====================
    // SEND METHODS
    // =====================

    async sendOrderConfirmation(order, orderItems) {
        // Fetch bank details to include in confirmation email
        let bankDetails = null;
        try {
            const result = await pool.query("SELECT key, value FROM site_settings WHERE key LIKE 'bank_%'");
            bankDetails = {};
            result.rows.forEach(row => { bankDetails[row.key] = row.value; });
        } catch (e) { /* ignore */ }

        const html = this.orderConfirmationTemplate(order, orderItems, bankDetails);
        const subject = `Order Confirmed — ${order.order_number}`;
        await this.queueEmail(order.customer_email, subject, html, 'order_confirmation', { orderId: order.id });

        // Send to customer
        await this.sendEmail(order.customer_email, subject, html);

        // Send admin notification
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            const adminHtml = this.adminNewOrderTemplate(order, orderItems);
            await this.sendEmail(adminEmail, `New Order — ${order.order_number} — $${parseFloat(order.total_nzd).toFixed(2)}`, adminHtml);
        }
    }

    async sendOrderStatusUpdate(order, newStatus) {
        const html = this.orderStatusUpdateTemplate(order, newStatus);
        const statusLabel = newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const subject = `Order ${statusLabel} — ${order.order_number}`;
        await this.queueEmail(order.customer_email, subject, html, 'order_status_update', { orderId: order.id, status: newStatus });
        return this.sendEmail(order.customer_email, subject, html);
    }

    async sendTrackingUpdate(order) {
        const content = `
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">&#128230;</span>
            </div>

            <h2 style="margin: 0 0 8px; text-align: center; color: #1a1a2e; font-size: 24px;">Your Order Has Shipped!</h2>
            <p style="margin: 0 0 32px; text-align: center; color: #6c757d; font-size: 15px;">
                Great news, ${order.customer_name} — your order is on its way.
            </p>

            <!-- Order info -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4ff; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 20px; text-align: center;">
                        <span style="font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Order Number</span><br>
                        <span style="font-size: 20px; font-weight: 700; color: #0f3460;">${order.order_number}</span>
                    </td>
                </tr>
            </table>

            ${order.tracking_number ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #d4edda; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 20px;">
                        <h4 style="margin: 0 0 8px; font-size: 13px; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Tracking Number</h4>
                        <p style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #155724; font-family: monospace;">${order.tracking_number}</p>
                        ${order.tracking_url ? `
                        <a href="${order.tracking_url}" style="display: inline-block; background-color: #155724; color: #ffffff; padding: 10px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            Track Your Parcel
                        </a>
                        ` : ''}
                    </td>
                </tr>
            </table>
            ` : ''}

            ${parseFloat(order.shipping_cost || 0) > 0 ? `
            <p style="font-size: 14px; color: #495057; margin: 0 0 24px;">
                <strong>Shipping cost:</strong> NZD $${parseFloat(order.shipping_cost).toFixed(2)}
            </p>
            ` : ''}

            <div style="background-color: #e8f4fd; border-left: 4px solid #0f3460; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #495057;">
                    If you have any questions about your delivery, just reply to this email and we'll help you out.
                </p>
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center;">
                        <a href="${this.baseUrl}/user/orders/${order.id}" style="display: inline-block; background-color: #0f3460; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                            View Order Details
                        </a>
                    </td>
                </tr>
            </table>
        `;

        const html = this._baseLayout(content);
        const subject = `Your Order Has Shipped — ${order.order_number}`;
        await this.queueEmail(order.customer_email, subject, html, 'tracking_update', { orderId: order.id });
        return this.sendEmail(order.customer_email, subject, html);
    }

    async sendPasswordReset(user, resetLink) {
        const html = this.passwordResetTemplate(user.username, resetLink);
        await this.queueEmail(user.email, 'Password Reset Request', html, 'password_reset', { userId: user.id });
        return this.sendEmail(user.email, 'Password Reset Request', html);
    }

    async sendWelcomeEmail(user) {
        const html = this.welcomeEmailTemplate(user.username);
        await this.queueEmail(user.email, 'Welcome to Truly Collectables!', html, 'welcome', { userId: user.id });
        return this.sendEmail(user.email, 'Welcome to Truly Collectables!', html);
    }
}

module.exports = new EmailService();
