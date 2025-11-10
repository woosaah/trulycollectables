const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  /**
   * Run all tests and return results
   */
  static async runAllTests() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      exec('npm test -- --json --coverage', {
        cwd: path.join(__dirname, '..'),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }, (error, stdout, stderr) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        try {
          // Parse Jest JSON output
          const lines = stdout.split('\n').filter(line => line.trim());
          const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"testResults"'));

          let results = {
            success: !error,
            duration,
            summary: {},
            testResults: [],
            coverage: null,
            error: error ? error.message : null
          };

          if (jsonLine) {
            const parsed = JSON.parse(jsonLine);
            results.testResults = parsed.testResults || [];
            results.summary = {
              numTotalTests: parsed.numTotalTests || 0,
              numPassedTests: parsed.numPassedTests || 0,
              numFailedTests: parsed.numFailedTests || 0,
              numPendingTests: parsed.numPendingTests || 0,
              numTotalTestSuites: parsed.numTotalTestSuites || 0,
              numPassedTestSuites: parsed.numPassedTestSuites || 0,
              numFailedTestSuites: parsed.numFailedTestSuites || 0
            };
          }

          // Try to read coverage summary
          try {
            const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
            if (fs.existsSync(coveragePath)) {
              results.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
            }
          } catch (e) {
            // Coverage not available
          }

          resolve(results);
        } catch (parseError) {
          // If JSON parsing fails, return basic info
          resolve({
            success: !error,
            duration,
            summary: {
              numTotalTests: 0,
              numPassedTests: 0,
              numFailedTests: 0
            },
            testResults: [],
            coverage: null,
            error: parseError.message,
            rawOutput: stdout,
            rawError: stderr
          });
        }
      });
    });
  }

  /**
   * Run tests for specific model
   */
  static async runModelTests(modelName) {
    return new Promise((resolve, reject) => {
      const testFile = `tests/models/${modelName}.test.js`;
      const startTime = Date.now();

      exec(`npm test -- ${testFile} --json`, {
        cwd: path.join(__dirname, '..'),
        maxBuffer: 5 * 1024 * 1024
      }, (error, stdout, stderr) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"testResults"'));

          let results = {
            success: !error,
            duration,
            model: modelName,
            summary: {},
            testResults: [],
            error: error ? error.message : null
          };

          if (jsonLine) {
            const parsed = JSON.parse(jsonLine);
            results.testResults = parsed.testResults || [];
            results.summary = {
              numTotalTests: parsed.numTotalTests || 0,
              numPassedTests: parsed.numPassedTests || 0,
              numFailedTests: parsed.numFailedTests || 0
            };
          }

          resolve(results);
        } catch (parseError) {
          resolve({
            success: !error,
            duration,
            model: modelName,
            error: parseError.message,
            rawOutput: stdout,
            rawError: stderr
          });
        }
      });
    });
  }

  /**
   * Run integration tests
   */
  static async runIntegrationTests() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      exec('npm run test:integration -- --json', {
        cwd: path.join(__dirname, '..'),
        maxBuffer: 5 * 1024 * 1024
      }, (error, stdout, stderr) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"testResults"'));

          let results = {
            success: !error,
            duration,
            summary: {},
            testResults: [],
            error: error ? error.message : null
          };

          if (jsonLine) {
            const parsed = JSON.parse(jsonLine);
            results.testResults = parsed.testResults || [];
            results.summary = {
              numTotalTests: parsed.numTotalTests || 0,
              numPassedTests: parsed.numPassedTests || 0,
              numFailedTests: parsed.numFailedTests || 0
            };
          }

          resolve(results);
        } catch (parseError) {
          resolve({
            success: !error,
            duration,
            error: parseError.message,
            rawOutput: stdout,
            rawError: stderr
          });
        }
      });
    });
  }

  /**
   * Get list of available test files
   */
  static getAvailableTests() {
    const tests = {
      models: [],
      routes: [],
      integration: []
    };

    try {
      const testsDir = path.join(__dirname, '..', 'tests');

      // Model tests
      const modelsDir = path.join(testsDir, 'models');
      if (fs.existsSync(modelsDir)) {
        tests.models = fs.readdirSync(modelsDir)
          .filter(file => file.endsWith('.test.js'))
          .map(file => file.replace('.test.js', ''));
      }

      // Route tests
      const routesDir = path.join(testsDir, 'routes');
      if (fs.existsSync(routesDir)) {
        tests.routes = fs.readdirSync(routesDir)
          .filter(file => file.endsWith('.test.js'))
          .map(file => file.replace('.test.js', ''));
      }

      // Integration tests
      const integrationDir = path.join(testsDir, 'integration');
      if (fs.existsSync(integrationDir)) {
        tests.integration = fs.readdirSync(integrationDir)
          .filter(file => file.endsWith('.test.js'))
          .map(file => file.replace('.test.js', ''));
      }
    } catch (error) {
      console.error('Error reading test files:', error);
    }

    return tests;
  }

  /**
   * Get test coverage summary
   */
  static getCoverageSummary() {
    try {
      const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

        // Calculate overall coverage
        const total = coverage.total;
        return {
          lines: total.lines.pct,
          statements: total.statements.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          files: Object.keys(coverage).length - 1 // Exclude 'total'
        };
      }
    } catch (error) {
      console.error('Error reading coverage:', error);
    }

    return null;
  }

  /**
   * Format test results for display
   */
  static formatResults(results) {
    const formatted = {
      success: results.success,
      duration: `${(results.duration / 1000).toFixed(2)}s`,
      summary: results.summary,
      suites: []
    };

    if (results.testResults && results.testResults.length > 0) {
      formatted.suites = results.testResults.map(suite => ({
        name: path.basename(suite.name),
        status: suite.status,
        duration: `${(suite.perfStats?.runtime || 0) / 1000}s`,
        tests: suite.assertionResults ? suite.assertionResults.map(test => ({
          title: test.fullName || test.title,
          status: test.status,
          duration: `${test.duration || 0}ms`,
          failureMessages: test.failureMessages || []
        })) : []
      }));
    }

    return formatted;
  }
}

module.exports = TestRunner;
