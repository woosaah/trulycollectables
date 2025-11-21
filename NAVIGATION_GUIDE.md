# TrulyCollectables Platform Navigation Guide

## Overview

This document shows how all modules and features are connected and accessible throughout the platform.

---

## 🏠 Main Navigation (Available to Everyone)

### Top Navigation Bar (Header)

**Location:** `views/partials/header.ejs`

| Link | Route | Description | Visibility |
|------|-------|-------------|------------|
| **TrulyCollectables** (Logo) | `/` | Homepage | Everyone |
| Browse Cards | `/cards` | Browse all trading cards | Everyone |
| Figurines | `/figurines` | Browse figurines | Everyone |
| My Collection | `/user/collection` | User's personal collection | Logged-in users only |
| Cart | `/user/cart` | Shopping cart | Logged-in users only |
| Login | `/auth/login` | Login page | Guests only |
| Register | `/auth/register` | Sign-up page | Guests only |

### User Dropdown Menu (When Logged In)

| Link | Route | Description |
|------|-------|-------------|
| Dashboard | `/user/dashboard` | User dashboard |
| Orders | `/user/orders` | Order history |
| Collection | `/user/collection` | My collection |
| **Admin Panel** | `/admin` | Admin dashboard (Admins only) |
| Logout | `/auth/logout` | Log out |

---

## 👤 User Features (Authenticated Users)

### User Dashboard
**Route:** `/user/dashboard`

Features available:
- View order history
- Access personal collection
- Manage cart
- View account information

### Personal Collection Management
**Route:** `/user/collection`

Features:
- ✅ Create and manage collection lists
- ✅ Add cards to "Have" list
- ✅ Add cards to "Want" list
- ✅ View matching cards in inventory
- ✅ Export collection to CSV
- ✅ Track collection statistics

**Related Routes:**
- `/user/collection/add` - Add items to collection
- `/user/collection/edit/:id` - Edit collection item
- `/user/collection/matches` - View matching cards
- `/user/collection/export` - Export to CSV

### Shopping Cart & Checkout
**Route:** `/user/cart`

Features:
- Add/remove items
- Update quantities
- Apply coupon codes
- Proceed to checkout

**Checkout Route:** `/user/checkout`

### Order Management
**Route:** `/user/orders`

Features:
- View all orders
- Track order status
- View order details
- Reorder items

---

## 🔐 Authentication System

### Sign Up (Registration)
**Route:** `/auth/register`
**View:** `views/public/register.ejs`

Features:
- Create new account
- Choose username
- Set password
- Automatic customer role assignment

### Login
**Route:** `/auth/login`
**View:** `views/public/login.ejs`

Features:
- Email/password authentication
- Remember me option
- Redirect to previous page after login

### Logout
**Route:** `/auth/logout`

---

## 🛡️ Admin Panel (Admins Only)

### Admin Dashboard
**Route:** `/admin`
**View:** `views/admin/dashboard.ejs`

**Quick Actions Available:**
1. 📦 **Manage Cards** → `/admin/cards`
2. ➕ **Add Card** → `/admin/cards/add`
3. 📋 **Manage Orders** → `/admin/orders`
4. 🏆 **Manage Figurines** → `/admin/figurines`
5. ✉️ **Manage Inquiries** → `/admin/inquiries`
6. 👥 **Manage Users** → `/admin/users` ⭐ NEW

**Dashboard Statistics:**
- Pending orders count
- Pending figurines count
- New inquiries count

**Special Features:**
- 📊 **Bulk CSV Import** → `/admin/csv-import`
- 🧪 **Unit Testing** → `/admin/tests`

---

## 👥 User Management (Admins Only)

### User Management Dashboard
**Route:** `/admin/users`
**View:** `views/admin/users.ejs` ⭐ NEW

**Features:**
✅ View all users with pagination
✅ Search users by username or email
✅ Filter users by role (Admin/Customer)
✅ View user statistics:
   - Total users
   - Admin count
   - Customer count
   - New users (last 30 days)

**User Actions:**
- **Change Role:** Convert customer ↔ admin
- **Delete User:** Remove user from system
- **Protection:** Cannot delete or demote yourself

**API Endpoints:**
- `POST /admin/users/:id/role` - Update user role
- `POST /admin/users/:id/delete` - Delete user

---

## 📦 Card Management (Admins Only)

### Manage Cards
**Route:** `/admin/cards`

Features:
- View all cards
- Search and filter
- Edit card details
- Delete cards
- Upload multiple images
- Track inventory

### Add New Card
**Route:** `/admin/cards/add`

Features:
- Add single card
- Upload images
- Set pricing
- Manage stock

### Bulk Import
**Route:** `/admin/csv-import`

Features:
- Import hundreds of cards from CSV
- Column mapping
- Duplicate detection
- Preview before importing
- Import history tracking

---

## 📋 Order Management (Admins Only)

### Manage Orders
**Route:** `/admin/orders`

Features:
- View all orders
- Filter by status
- Update order status
- View order details
- Process refunds

---

## 🏆 Figurine Management (Admins Only)

### Manage Figurines
**Route:** `/admin/figurines`

Features:
- Approve/reject figurines
- Edit figurine details
- Manage inventory
- Set pricing

---

## ✉️ Inquiry Management (Admins Only)

### Manage Inquiries
**Route:** `/admin/inquiries`

Features:
- View customer inquiries
- Respond to messages
- Mark as resolved
- Track inquiry status

---

## 🧪 Testing Dashboard (Admins Only)

### Unit Tests
**Route:** `/admin/tests`

Features:
- Run all tests
- Run specific model tests
- View test results
- Check code coverage

**Test Routes:**
- `POST /admin/tests/run-all` - Run all tests
- `POST /admin/tests/run-model/:name` - Run specific model tests
- `GET /admin/tests/coverage` - View coverage report

---

## 🔒 Access Control Summary

### Public Access (No Login Required)
- Homepage
- Browse cards
- Browse figurines
- View card details
- View figurine details
- Login page
- Register page

### Authenticated Users Only
- User dashboard
- Personal collection
- Shopping cart
- Checkout
- Order history
- My orders

### Admin Only
- Admin dashboard
- Card management
- Order management
- Figurine management
- Inquiry management
- **User management** ⭐ NEW
- CSV import
- Testing dashboard
- System settings

---

## 🗺️ Site Map

```
/                                 (Homepage - Public)
├── /cards                        (Browse cards - Public)
│   └── /card/:id                 (Card details - Public)
├── /figurines                    (Browse figurines - Public)
│   └── /figurine/:id             (Figurine details - Public)
├── /auth
│   ├── /login                    (Login - Public)
│   ├── /register                 (Sign up - Public) ✅
│   └── /logout                   (Logout - Authenticated)
├── /user                         (User area - Authenticated)
│   ├── /dashboard                (User dashboard)
│   ├── /collection               (Personal collection) ✅
│   ├── /cart                     (Shopping cart)
│   ├── /checkout                 (Checkout)
│   └── /orders                   (Order history)
└── /admin                        (Admin area - Admin only)
    ├── /                         (Admin dashboard)
    ├── /cards                    (Manage cards)
    ├── /orders                   (Manage orders)
    ├── /figurines                (Manage figurines)
    ├── /inquiries                (Manage inquiries)
    ├── /users                    (Manage users) ⭐ NEW
    ├── /csv-import               (Bulk import)
    └── /tests                    (Testing dashboard)
```

---

## ✅ Feature Checklist

### Core Features
- ✅ Homepage with featured cards
- ✅ Browse cards with filtering
- ✅ Browse figurines
- ✅ Card details page
- ✅ Shopping cart
- ✅ Checkout process
- ✅ User authentication (login/register) ✅
- ✅ User dashboard
- ✅ Personal collection management ✅
- ✅ Order history

### Admin Features
- ✅ Admin dashboard (admin only) ✅
- ✅ Card inventory management
- ✅ Order management
- ✅ Figurine management
- ✅ Inquiry management
- ✅ User management ⭐ NEW
- ✅ Bulk CSV import
- ✅ Testing dashboard

### Security Features
- ✅ Role-based access control
- ✅ Admin-only routes protected
- ✅ User authentication required for sensitive actions
- ✅ Password hashing
- ✅ Session management
- ✅ CSRF protection
- ✅ Self-protection (can't delete/demote yourself)

---

## 📱 Mobile Responsive

All pages are mobile-responsive with Bootstrap 5:
- Collapsible navigation menu
- Responsive grid layouts
- Touch-friendly buttons
- Mobile-optimized forms

---

## 🎯 Quick Access Guide

### For New Users:
1. Visit homepage → Click **Register** (top right)
2. Create account → Auto login
3. Browse cards → Add to cart
4. Checkout → Place order
5. View **My Collection** → Manage personal collection ✅

### For Admins:
1. Login with admin credentials
2. Click profile dropdown → **Admin Panel**
3. Access all admin features:
   - Manage Cards
   - Manage Orders
   - Manage Users ⭐ NEW
   - Bulk Import
   - Run Tests

---

## 🔗 All Features Connected

✅ **Sign-up screen available** - `/auth/register`
✅ **Admin screen for admins only** - `/admin` (role-based access)
✅ **User management screen** - `/admin/users` (admins can manage all users)
✅ **Collection creation available** - `/user/collection` (users can create and manage collections)

All modules are fully integrated and accessible through the navigation!
