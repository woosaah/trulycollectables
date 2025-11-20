const fs = require('fs');
const path = require('path');

class ClaudeFixReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options;
        this.failures = [];
    }

    onTestResult(test, testResult, aggregatedResult) {
        if (testResult.numFailingTests > 0) {
            testResult.testResults.forEach(result => {
                if (result.status === 'failed') {
                    this.failures.push({
                        testPath: testResult.testFilePath,
                        testName: result.fullName,
                        errors: result.failureMessages,
                        duration: result.duration
                    });
                }
            });
        }
    }

    onRunComplete(contexts, results) {
        if (this.failures.length > 0) {
            const fixFilePath = path.join(process.cwd(), 'claude-fix.md');
            let content = '# Test Failures - Auto-Generated Fix List\n\n';
            content += `**Generated:** ${new Date().toISOString()}\n\n`;
            content += `**Total Failures:** ${this.failures.length}\n\n`;
            content += '---\n\n';

            this.failures.forEach((failure, index) => {
                const relativePath = path.relative(process.cwd(), failure.testPath);
                content += `## ${index + 1}. ${failure.testName}\n\n`;
                content += `**File:** \`${relativePath}\`\n\n`;
                content += `**Duration:** ${failure.duration}ms\n\n`;
                content += '**Error:**\n\n';
                content += '```\n';
                content += failure.errors.join('\n\n');
                content += '\n```\n\n';
                content += '---\n\n';
            });

            content += '\n## Summary\n\n';
            content += `- Total test failures: ${this.failures.length}\n`;
            content += `- Total tests run: ${results.numTotalTests}\n`;
            content += `- Pass rate: ${((results.numPassedTests / results.numTotalTests) * 100).toFixed(2)}%\n`;

            fs.writeFileSync(fixFilePath, content, 'utf8');
            console.log(`\n✓ Failure report written to: claude-fix.md`);
        } else {
            // Remove claude-fix.md if all tests pass
            const fixFilePath = path.join(process.cwd(), 'claude-fix.md');
            if (fs.existsSync(fixFilePath)) {
                fs.unlinkSync(fixFilePath);
                console.log('\n✓ All tests passed - claude-fix.md removed');
            }
        }
    }
}

module.exports = ClaudeFixReporter;
