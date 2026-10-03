# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrulyCollectables — a Node.js/Express ecommerce platform for trading cards with integrated collection management. Uses PostgreSQL, EJS templates, and session-based authentication.

## Common Commands

```bash
npm run dev              # Start dev server with nodemon (port 3000)
npm run start            # Production start
npm test                 # Run all tests with coverage
npm run test:models      # Model tests only
npm run test:routes      # Route tests only
npm run test:integration # Integration tests only
```

Run a single test file:
```bash
npx jest tests/models/Card.test.js --verbose
```

Database setup:
```bash
psql trulycollectables < database/schema.sql      # Base schema
psql trulycollectables < database/migrations.sql   # Enterprise features
psql trulycollectables < database/session.sql       # Session table
```

## Architecture

**MVC pattern** with Express routing:

- `server.js` — App entry point, middleware stack, route mounting
- `config/database.js` — PostgreSQL connection pool (pg library)
- `routes/` — Route handlers: `public.js`, `auth.js`, `user.js`, `admin.js`, `api.js`
- `models/` — Static method classes wrapping parameterized SQL queries (e.g., `Card.getAll()`, `User.findByEmail()`)
- `views/` — EJS templates organized by domain: `public/`, `user/`, `admin/`, `partials/`
- `middleware/` — Auth (`requireAuth`, `requireAdmin`), security (Helmet, CSRF), rate limiting, API auth, activity logging
- `public/` — Static CSS/JS/images
- `uploads/` — User-uploaded card images (gitignored)

**Route mounting pattern** (in server.js):
- `/` → `routes/public.js`
- `/auth` → `routes/auth.js`
- `/user` → `routes/user.js`
- `/admin` → `routes/admin.js` (requires admin role)
- `/api/v1` → `routes/api.js` (HTTP Basic Auth with API keys)

## Database

PostgreSQL with raw SQL via `pg` pool — no ORM. All queries use parameterized placeholders (`$1`, `$2`). Models export static async methods that return query results directly.

Key tables: `users`, `cards`, `figurines`, `accessories`, `cart`, `orders`, `order_items`, `user_collections`, `reviews`, `wishlist`, `csv_imports`, `activity_log`, `price_history`.

## Auth & Security

- Session-based auth stored in PostgreSQL (`connect-pg-simple`)
- Passwords hashed with bcrypt (10 rounds)
- CSRF tokens required on all POST/PUT/DELETE forms
- Rate limiting per action type (login, registration, password reset, API)
- API uses HTTP Basic Auth (username + API key from user record)
- Middleware: `requireAuth`, `requireAdmin`, `requireApiAuth`, `requireApiAdmin`

## Configuration

All config via `.env` (see `.env.example`). Key variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `PORT`, `NODE_ENV`.

## Testing

Jest + Supertest. Tests live in `tests/` with subdirectories: `models/`, `routes/`, `integration/`. Coverage collected from `models/` and `routes/`. There is also a browser-based test runner at `/admin/tests`.

## Key Conventions

- Models use static async methods with raw SQL (no ORM, no query builder)
- Database columns use `snake_case`, JS variables use `camelCase`
- File uploads handled by Multer with Sharp for image processing
- CSV bulk import/export for inventory management
- EJS templates receive data via `res.render()` with locals

## Session status tracking

Update `STATUS.md` in this repo root when you make notable changes, fix bugs, or learn something worth remembering. Stuart also uses a cross-project tracker (`claude-os`, on his local machine) that reads this file over SSH — keeping it current means work here shows up there without needing to be relayed manually.
