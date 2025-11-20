# TrulyCollectables Testing Framework

Comprehensive unit testing system with admin interface for running tests after updates.

## Overview

This platform includes automated tests for:
- **Model Tests** - Database operations and business logic
- **Route Tests** - API endpoints and request handling
- **Integration Tests** - Complete user workflows

## Running Tests

### Via Command Line

```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:models
npm run test:routes
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Via Admin Panel

1. Navigate to `/admin/tests`
2. Click "Run All Tests" for complete suite
3. Or click individual model tests
4. View detailed results with pass/fail status
5. Check coverage report

## Test Structure

```
tests/
├── models/                    # Model unit tests
│   ├── Card.test.js          # Card model tests
│   ├── CsvImport.test.js     # CSV import tests
│   └── SocialProof.test.js   # Social proof tests
├── routes/                    # Route/endpoint tests
│   └── (coming soon)
└── integration/               # Workflow tests
    └── card-workflow.test.js # Complete card lifecycle
```

## What's Tested

### Card Model (`Card.test.js`)
- ✅ Creating cards with all fields
- ✅ Creating cards with minimal fields
- ✅ Finding cards by ID
- ✅ Filtering by sport type
- ✅ Filtering by price range
- ✅ Searching by name
- ✅ Updating card fields
- ✅ Deleting cards
- ✅ Counting cards
- ✅ Getting distinct sport types
- ✅ Getting distinct sets
- ✅ Getting featured cards

### CSV Import Model (`CsvImport.test.js`)
- ✅ Mapping CSV rows with default columns
- ✅ Mapping with custom column names
- ✅ Validating card data
- ✅ Detecting missing required fields
- ✅ Validating year ranges
- ✅ Validating prices
- ✅ Validating conditions
- ✅ Detecting duplicate cards
- ✅ Identifying unique cards
- ✅ Generating CSV templates
- ✅ Import history tracking

### Social Proof Model (`SocialProof.test.js`)
- ✅ Tracking card views
- ✅ Counting recent viewers
- ✅ Recording sales
- ✅ Getting recently sold cards
- ✅ Price history tracking
- ✅ Calculating price trends
- ✅ Finding popular cards

### Integration Tests (`card-workflow.test.js`)
- ✅ Complete card lifecycle (create → view → sell)
- ✅ Search and filtering workflow
- ✅ Price updates with history
- ✅ Inventory management
- ✅ Stock availability handling
- ✅ Popularity tracking
- ✅ Social proof features

## Test Coverage

Coverage reports are generated automatically when running tests:

```bash
npm test
```

View detailed coverage:
- Command line: Check `coverage/` directory
- Admin panel: Visit `/admin/tests/coverage`

### Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Lines | 80% | Check dashboard |
| Statements | 80% | Check dashboard |
| Functions | 80% | Check dashboard |
| Branches | 70% | Check dashboard |

## Admin Test Dashboard

Access at: `/admin/tests`

**Features:**
- 📊 Coverage summary with visual indicators
- ▶️ One-click test execution
- 📝 Detailed pass/fail results
- ⚡ Run individual model tests
- 🔍 View full coverage reports
- 📈 Test history tracking

**Color Coding:**
- 🟢 Green (≥80%) - Excellent coverage
- 🟡 Yellow (60-79%) - Needs improvement
- 🔴 Red (<60%) - Critical - add more tests

## Writing New Tests

### Model Test Template

```javascript
const { describe, test, expect } = require('@jest/globals');

// Mock database
const mockDb = {
  query: jest.fn()
};

jest.mock('../../config/database', () => mockDb);

const YourModel = require('../../models/YourModel');

describe('YourModel', () => {
  describe('methodName', () => {
    test('should do something', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test' }]
      });

      // Act
      const result = await YourModel.methodName();

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });
});
```

### Integration Test Template

```javascript
const { describe, test, expect } = require('@jest/globals');

describe('Feature Workflow Integration Tests', () => {
  test('should complete full workflow', async () => {
    // Step 1: Setup
    // Step 2: Action
    // Step 3: Verify
    // Step 4: Cleanup (if needed)
  });
});
```

## When to Run Tests

### Before Deployment
Always run full test suite before deploying updates:
```bash
npm test
```

### After Updates
Run tests after:
- ✅ Adding new features
- ✅ Modifying existing code
- ✅ Fixing bugs
- ✅ Database schema changes
- ✅ Dependency updates

### During Development
Use watch mode during development:
```bash
npm run test:watch
```

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Tests
  run: npm test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Failing After Updates

1. **Check database mocks** - Ensure mock responses match new schema
2. **Review error messages** - Read failure details in test results
3. **Run individual tests** - Isolate the failing test
4. **Check recent changes** - Review what was modified

### Low Coverage

1. **Identify uncovered code** - Check coverage report
2. **Write missing tests** - Focus on critical paths first
3. **Test edge cases** - Don't just test happy paths
4. **Run coverage** - `npm test` shows what's missing

### Admin Panel Issues

**Tests won't run:**
- Check server logs for errors
- Ensure Jest is installed: `npm install`
- Verify test files exist in `tests/` directory

**No coverage displayed:**
- Run tests first to generate coverage
- Check `coverage/` directory exists
- Ensure tests completed successfully

## Best Practices

### ✅ DO
- Write tests for new features
- Test both success and failure cases
- Use descriptive test names
- Mock external dependencies
- Keep tests independent
- Run tests before committing
- Maintain >80% coverage

### ❌ DON'T
- Skip tests for "simple" code
- Write dependent tests (order matters)
- Test implementation details
- Commit failing tests
- Ignore test failures
- Copy-paste tests without understanding

## Test Dependencies

```json
{
  "jest": "^29.7.0",
  "supertest": "^6.3.3",
  "@jest/globals": "^29.7.0"
}
```

## Configuration

Jest config in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "models/**/*.js",
      "routes/**/*.js"
    ],
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests with coverage |
| `npm run test:models` | Run only model tests |
| `npm run test:routes` | Run only route tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:watch` | Watch mode for development |

## Admin Routes

- `/admin/tests` - Test dashboard
- `/admin/tests/run-all` - Run all tests (POST)
- `/admin/tests/run-model/:name` - Run specific model (POST)
- `/admin/tests/run-integration` - Run integration tests (POST)
- `/admin/tests/coverage` - View coverage report (GET)

## Support

For questions or issues:
1. Check test output for error messages
2. Review this documentation
3. Check individual test files for examples
4. Review model/route implementation

---

**Remember:** Tests are your safety net. They catch bugs before users do! 🛡️

Keep tests updated, maintain coverage, and run them regularly for a reliable, bug-free platform.
