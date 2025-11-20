# Testing Guide

This document provides comprehensive information about the test suite for TrulyCollectables platform.

## Overview

The platform has **comprehensive test coverage** across all layers:

- ✅ **Model Tests** - 11 test files covering all database models
- ✅ **Route Tests** - 4 test files covering all API endpoints
- ✅ **Service Tests** - 2 test files for email and TradeMe services  
- ✅ **Middleware Tests** - 2 test files for auth and security
- ✅ **UI Tests** - 5 Puppeteer test files for all user interfaces
- ✅ **Custom Reporter** - Auto-generates `claude-fix.md` on test failures

**Total Test Files:** 24+ comprehensive test suites

---

## Running Tests

### Prerequisites

1. PostgreSQL database running on localhost:5432
2. Database named `trulycollectables` created
3. Environment variables configured in `.env`
4. Dependencies installed: `npm install`

### Run All Tests

\`\`\`bash
npm test
\`\`\`

### Run Specific Test Categories

\`\`\`bash
# Model tests only
npm run test:models

# Route tests only
npm run test:routes

# Integration tests
npm run test:integration
\`\`\`

### Run Specific Test File

\`\`\`bash
npm test -- tests/models/User.test.js
npm test -- tests/routes/auth.test.js
\`\`\`

---

## Claude-Fix Reporter

When tests fail, a `claude-fix.md` file is **automatically generated** with:

- Detailed error messages and stack traces
- File locations of failures
- Test duration
- Pass rate summary

This file is automatically removed when all tests pass.

---

## Test Coverage

The test suite covers:

1. **Models** - All CRUD operations, validations, business logic
2. **Routes** - HTTP endpoints, authentication, authorization
3. **Services** - Email, TradeMe API integration
4. **Middleware** - Auth, security, rate limiting
5. **UI** - User interactions, forms, navigation

**See individual test files for detailed coverage.**

---

For more details, see the test files in `tests/` directory.
