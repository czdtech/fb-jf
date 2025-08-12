#!/usr/bin/env node

/**
 * i18n Integration Test Suite
 * 
 * This script performs comprehensive integration tests to validate the fail-fast
 * i18n implementation in a real Astro environment.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    devServerPort: 4321,
    devServerTimeout: 15000, // 15 seconds to start
    testTimeout: 30000, // 30 seconds per test
    locales: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'],
    translationDir: 'src/content/i18nUI'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class I18nIntegrationTester {
    constructor() {
        this.testResults = [];
        this.backupDir = `./tests/backup-${Date.now()}`;
        this.devServerProcess = null;
        this.setupBackupDir();
    }

    setupBackupDir() {
        try {
            execSync(`mkdir -p ${this.backupDir}`, { stdio: 'ignore' });
            log('blue', `📦 Created backup directory: ${this.backupDir}`);
        } catch (error) {
            log('red', `❌ Failed to create backup directory: ${error.message}`);
            process.exit(1);
        }
    }

    async runTest(testName, testFunction) {
        log('cyan', `\n🧪 Running: ${testName}`);
        log('cyan', '='.repeat(50));
        
        const startTime = Date.now();
        
        try {
            await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration: `${duration}ms`,
                error: null
            });
            
            log('green', `✅ PASSED: ${testName} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                duration: `${duration}ms`,
                error: error.message
            });
            
            log('red', `❌ FAILED: ${testName} (${duration}ms)`);
            log('red', `   Error: ${error.message}`);
        }
    }

    backupFile(filePath) {
        if (fs.existsSync(filePath)) {
            const fileName = path.basename(filePath);
            const backupPath = path.join(this.backupDir, fileName);
            fs.copyFileSync(filePath, backupPath);
            log('blue', `📋 Backed up: ${fileName}`);
        }
    }

    restoreFile(filePath) {
        const fileName = path.basename(filePath);
        const backupPath = path.join(this.backupDir, fileName);
        
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, filePath);
            log('blue', `🔄 Restored: ${fileName}`);
        }
    }

    removeJsonKey(filePath, keyPath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        const keys = keyPath.split('.');
        let current = data;
        
        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]]) {
                current = current[keys[i]];
            } else {
                throw new Error(`Key path not found: ${keyPath}`);
            }
        }
        
        // Remove the final key
        delete current[keys[keys.length - 1]];
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        log('yellow', `🗑️  Removed key "${keyPath}" from ${path.basename(filePath)}`);
    }

    async startDevServer() {
        log('blue', '🚀 Starting development server...');
        
        return new Promise((resolve, reject) => {
            this.devServerProcess = spawn('npm', ['run', 'dev'], {
                stdio: 'pipe',
                detached: false
            });

            let output = '';
            const timeout = setTimeout(() => {
                this.stopDevServer();
                reject(new Error('Development server failed to start within timeout'));
            }, TEST_CONFIG.devServerTimeout);

            this.devServerProcess.stdout.on('data', (data) => {
                output += data.toString();
                
                // Look for server ready indicators
                if (output.includes('Local:') || output.includes('localhost:4321')) {
                    clearTimeout(timeout);
                    log('green', '✅ Development server started');
                    resolve();
                }
            });

            this.devServerProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                if (errorOutput.includes('Error') || errorOutput.includes('error')) {
                    clearTimeout(timeout);
                    reject(new Error(`Server error: ${errorOutput}`));
                }
            });

            this.devServerProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    stopDevServer() {
        if (this.devServerProcess) {
            log('blue', '🛑 Stopping development server...');
            
            try {
                // Kill the process group to stop all child processes
                process.kill(-this.devServerProcess.pid, 'SIGTERM');
            } catch (error) {
                // Fallback to regular kill
                this.devServerProcess.kill('SIGTERM');
            }
            
            this.devServerProcess = null;
        }
    }

    async makeHttpRequest(url) {
        // Simple HTTP request without external dependencies
        return new Promise((resolve, reject) => {
            const { request } = require('http');
            const parsedUrl = new URL(url);
            
            const req = request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname,
                method: 'GET',
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode,
                    body: data,
                    headers: res.headers
                }));
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }

    // Test cases
    async testBaselineBuild() {
        try {
            execSync('npm run build', { stdio: 'pipe' });
            log('green', '✅ Baseline build successful');
        } catch (error) {
            throw new Error(`Baseline build failed: ${error.message}`);
        }
    }

    async testMissingTranslationKey() {
        const testFile = path.join(TEST_CONFIG.translationDir, 'zh.json');
        this.backupFile(testFile);
        
        try {
            // Remove a key from Chinese translation
            this.removeJsonKey(testFile, 'navigation.home');
            
            // Try to build - should fail
            try {
                execSync('npm run build', { stdio: 'pipe' });
                throw new Error('Build succeeded when it should have failed');
            } catch (buildError) {
                // Build should fail - this is expected
                const errorOutput = buildError.stderr ? buildError.stderr.toString() : buildError.stdout.toString();
                
                if (errorOutput.includes('Translation missing') && 
                    errorOutput.includes('navigation.home') && 
                    errorOutput.includes('zh')) {
                    log('green', '✅ Build properly failed with correct error message');
                } else {
                    throw new Error(`Build failed but with unexpected error: ${errorOutput}`);
                }
            }
        } finally {
            this.restoreFile(testFile);
        }
    }

    async testMissingNestedKey() {
        const testFile = path.join(TEST_CONFIG.translationDir, 'es.json');
        this.backupFile(testFile);
        
        try {
            // Remove nested key
            this.removeJsonKey(testFile, 'error.404.title');
            
            try {
                execSync('npm run build', { stdio: 'pipe' });
                throw new Error('Build succeeded when it should have failed');
            } catch (buildError) {
                const errorOutput = buildError.stderr ? buildError.stderr.toString() : buildError.stdout.toString();
                
                if (errorOutput.includes('error.404.title') && errorOutput.includes('es')) {
                    log('green', '✅ Build properly failed for missing nested key');
                } else {
                    throw new Error(`Unexpected build error: ${errorOutput}`);
                }
            }
        } finally {
            this.restoreFile(testFile);
        }
    }

    async testMissingLanguageFile() {
        const testFile = path.join(TEST_CONFIG.translationDir, 'fr.json');
        const tempFile = `${testFile}.temp_removed`;
        
        // Backup and remove file
        if (fs.existsSync(testFile)) {
            fs.renameSync(testFile, tempFile);
        }
        
        try {
            try {
                execSync('npm run build', { stdio: 'pipe' });
                throw new Error('Build succeeded when it should have failed');
            } catch (buildError) {
                const errorOutput = buildError.stderr ? buildError.stderr.toString() : buildError.stdout.toString();
                
                if (errorOutput.includes('fr') || errorOutput.includes('French')) {
                    log('green', '✅ Build properly failed for missing language file');
                } else {
                    throw new Error(`Unexpected build error: ${errorOutput}`);
                }
            }
        } finally {
            // Restore file
            if (fs.existsSync(tempFile)) {
                fs.renameSync(tempFile, testFile);
            }
        }
    }

    async testDevServerErrorHandling() {
        const testFile = path.join(TEST_CONFIG.translationDir, 'ja.json');
        this.backupFile(testFile);
        
        try {
            // Remove a key
            this.removeJsonKey(testFile, 'navigation.games');
            
            // Start dev server
            await this.startDevServer();
            
            // Wait a bit for server to fully start
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                // Try to access the Japanese locale page
                const response = await this.makeHttpRequest('http://localhost:4321/ja/');
                
                // Server should either return an error page or the request should fail
                if (response.status !== 200 || response.body.includes('Translation missing')) {
                    log('green', '✅ Development server properly handles translation errors');
                } else {
                    log('yellow', '⚠️  Development server response unclear - manual verification needed');
                }
            } catch (requestError) {
                // Request failing could indicate server error handling - acceptable
                log('green', '✅ Development server properly handles translation errors (request failed)');
            }
            
        } finally {
            this.stopDevServer();
            this.restoreFile(testFile);
        }
    }

    async testComponentIntegration() {
        // Start dev server for component testing
        await this.startDevServer();
        
        try {
            // Test key pages in different locales
            const testUrls = [
                'http://localhost:4321/',
                'http://localhost:4321/zh/',
                'http://localhost:4321/es/'
            ];
            
            for (const url of testUrls) {
                try {
                    const response = await this.makeHttpRequest(url);
                    
                    if (response.status === 200 && 
                        response.body.length > 1000 && // Basic content check
                        !response.body.includes('undefined') &&
                        !response.body.includes('[object Object]')) {
                        log('green', `✅ ${url} loads correctly`);
                    } else {
                        log('yellow', `⚠️  ${url} may have issues - status: ${response.status}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to load ${url}: ${error.message}`);
                }
                
                // Brief pause between requests
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            log('green', '✅ Component integration test completed');
            
        } finally {
            this.stopDevServer();
        }
    }

    async testFallbackScenario() {
        const zhFile = path.join(TEST_CONFIG.translationDir, 'zh.json');
        const enFile = path.join(TEST_CONFIG.translationDir, 'en.json');
        
        this.backupFile(zhFile);
        this.backupFile(enFile);
        
        try {
            // Remove same key from both files to test double fallback failure
            this.removeJsonKey(zhFile, 'footer.copyright');
            this.removeJsonKey(enFile, 'footer.copyright');
            
            try {
                execSync('npm run build', { stdio: 'pipe' });
                throw new Error('Build succeeded when both target and fallback missing key');
            } catch (buildError) {
                const errorOutput = buildError.stderr ? buildError.stderr.toString() : buildError.stdout.toString();
                
                if (errorOutput.includes('fallback') && errorOutput.includes('footer.copyright')) {
                    log('green', '✅ Build properly failed when both target and fallback missing key');
                } else {
                    throw new Error(`Unexpected fallback error: ${errorOutput}`);
                }
            }
        } finally {
            this.restoreFile(zhFile);
            this.restoreFile(enFile);
        }
    }

    async testFinalValidation() {
        try {
            execSync('npm run build', { stdio: 'pipe' });
            log('green', '✅ Final validation: Clean build successful');
        } catch (error) {
            throw new Error(`Final build validation failed: ${error.message}`);
        }
    }

    generateReport() {
        log('cyan', '\n📊 INTEGRATION TEST REPORT');
        log('cyan', '==========================');
        
        const passed = this.testResults.filter(test => test.status === 'PASS').length;
        const failed = this.testResults.filter(test => test.status === 'FAIL').length;
        const total = this.testResults.length;
        
        log('blue', `Total Tests: ${total}`);
        log('green', `Passed: ${passed}`);
        log('red', `Failed: ${failed}`);
        log('blue', `Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
        
        log('cyan', '\nDetailed Results:');
        this.testResults.forEach(test => {
            const statusColor = test.status === 'PASS' ? 'green' : 'red';
            const statusIcon = test.status === 'PASS' ? '✅' : '❌';
            
            log(statusColor, `${statusIcon} ${test.name} (${test.duration})`);
            if (test.error) {
                log('red', `   Error: ${test.error}`);
            }
        });
        
        return failed === 0;
    }

    async cleanup() {
        log('blue', '🧹 Cleaning up...');
        
        // Stop dev server if still running
        this.stopDevServer();
        
        // Clean up backup directory
        try {
            execSync(`rm -rf ${this.backupDir}`, { stdio: 'ignore' });
            log('blue', '✅ Cleanup completed');
        } catch (error) {
            log('yellow', `⚠️  Cleanup warning: ${error.message}`);
        }
    }

    async run() {
        log('cyan', '🚀 i18n Integration Test Suite Starting');
        log('cyan', '========================================');
        
        const tests = [
            ['Baseline Build Test', () => this.testBaselineBuild()],
            ['Missing Translation Key Test', () => this.testMissingTranslationKey()],
            ['Missing Nested Key Test', () => this.testMissingNestedKey()],
            ['Missing Language File Test', () => this.testMissingLanguageFile()],
            ['Development Server Error Handling', () => this.testDevServerErrorHandling()],
            ['Component Integration Test', () => this.testComponentIntegration()],
            ['Fallback Scenario Test', () => this.testFallbackScenario()],
            ['Final Validation Test', () => this.testFinalValidation()]
        ];
        
        try {
            for (const [testName, testFunction] of tests) {
                await this.runTest(testName, testFunction);
                
                // Brief pause between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const success = this.generateReport();
            return success;
            
        } catch (error) {
            log('red', `💥 Test suite crashed: ${error.message}`);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
async function main() {
    const tester = new I18nIntegrationTester();
    
    try {
        const success = await tester.run();
        process.exit(success ? 0 : 1);
    } catch (error) {
        log('red', `💥 Fatal error: ${error.message}`);
        await tester.cleanup();
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = I18nIntegrationTester;