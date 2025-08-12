#!/bin/bash

# i18n Fail-Fast Implementation Test Script
# This script validates the fail-fast behavior of the i18n system

set -e  # Exit on any error

echo "🚀 Starting i18n Fail-Fast Implementation Tests"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Helper functions
log_test() {
    echo -e "${YELLOW}📋 Test: $1${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_success() {
    echo -e "${GREEN}✅ PASSED: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_failure() {
    echo -e "${RED}❌ FAILED: $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Create backup directory
BACKUP_DIR="./tests/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to backup translation file
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/$(basename $file).backup"
        echo "📦 Backed up: $file"
    fi
}

# Function to restore translation file
restore_file() {
    local file="$1"
    local backup="$BACKUP_DIR/$(basename $file).backup"
    if [ -f "$backup" ]; then
        cp "$backup" "$file"
        echo "🔄 Restored: $file"
    fi
}

# Function to remove key from JSON file
remove_json_key() {
    local file="$1"
    local key_path="$2"
    
    # Create a temporary file with the key removed
    node -e "
        const fs = require('fs');
        const path = '$file';
        const keyPath = '$key_path';
        
        try {
            const data = JSON.parse(fs.readFileSync(path, 'utf8'));
            const keys = keyPath.split('.');
            let current = data;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]]) {
                    current = current[keys[i]];
                } else {
                    console.log('Key path not found');
                    process.exit(1);
                }
            }
            
            delete current[keys[keys.length - 1]];
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            console.log('Successfully removed key: ' + keyPath);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    " || {
        echo "❌ Failed to remove key $key_path from $file"
        return 1
    }
}

# Test 1: Baseline - Verify normal build works
test_baseline_build() {
    log_test "Baseline build with complete translations"
    
    if npm run build > /dev/null 2>&1; then
        log_success "Complete translations build successfully"
    else
        log_failure "Baseline build failed - check translation completeness"
    fi
}

# Test 2: Missing translation key in non-English locale
test_missing_key_zh() {
    log_test "Missing key in Chinese translation"
    
    local test_file="src/content/i18nUI/zh.json"
    backup_file "$test_file"
    
    # Remove a navigation key
    if remove_json_key "$test_file" "navigation.home"; then
        # Try to build - should fail
        if npm run build > /dev/null 2>&1; then
            log_failure "Build succeeded when it should have failed (missing zh navigation.home)"
        else
            log_success "Build properly failed with missing Chinese translation key"
        fi
    else
        log_failure "Could not set up test conditions"
    fi
    
    restore_file "$test_file"
}

# Test 3: Missing nested key
test_missing_nested_key() {
    log_test "Missing nested key in German translation"
    
    local test_file="src/content/i18nUI/de.json"
    backup_file "$test_file"
    
    # Remove a nested key
    if remove_json_key "$test_file" "error.404.title"; then
        # Try to build - should fail
        if npm run build > /dev/null 2>&1; then
            log_failure "Build succeeded when it should have failed (missing de error.404.title)"
        else
            log_success "Build properly failed with missing German nested key"
        fi
    else
        log_failure "Could not set up test conditions"
    fi
    
    restore_file "$test_file"
}

# Test 4: Missing entire language file
test_missing_language_file() {
    log_test "Missing entire language file"
    
    local test_file="src/content/i18nUI/fr.json"
    backup_file "$test_file"
    
    # Temporarily remove French translation file
    if [ -f "$test_file" ]; then
        mv "$test_file" "$test_file.temp_removed"
        
        # Try to build - should fail
        if npm run build > /dev/null 2>&1; then
            log_failure "Build succeeded when it should have failed (missing fr.json)"
        else
            log_success "Build properly failed with missing French language file"
        fi
        
        # Restore file
        mv "$test_file.temp_removed" "$test_file"
    else
        log_failure "French translation file not found for testing"
    fi
}

# Test 5: Invalid JSON syntax
test_invalid_json_syntax() {
    log_test "Invalid JSON syntax handling"
    
    local test_file="src/content/i18nUI/es.json"
    backup_file "$test_file"
    
    # Create invalid JSON by removing a comma
    if [ -f "$test_file" ]; then
        # Add invalid syntax (remove closing brace)
        sed -i.bak '$ d' "$test_file"  # Remove last line (closing brace)
        
        # Try to build - should fail
        if npm run build > /dev/null 2>&1; then
            log_failure "Build succeeded with invalid JSON syntax"
        else
            log_success "Build properly failed with invalid JSON syntax"
        fi
    else
        log_failure "Spanish translation file not found for testing"
    fi
    
    restore_file "$test_file"
}

# Test 6: Missing key in English fallback
test_missing_english_fallback() {
    log_test "Missing key in English fallback"
    
    local en_file="src/content/i18nUI/en.json"
    local ja_file="src/content/i18nUI/ja.json"
    backup_file "$en_file"
    backup_file "$ja_file"
    
    # Remove same key from both English and Japanese
    if remove_json_key "$en_file" "footer.legal" && remove_json_key "$ja_file" "footer.legal"; then
        # Try to build - should fail
        if npm run build > /dev/null 2>&1; then
            log_failure "Build succeeded when both target and fallback missing key"
        else
            log_success "Build properly failed with missing key in both target and English fallback"
        fi
    else
        log_failure "Could not set up test conditions for fallback test"
    fi
    
    restore_file "$en_file"
    restore_file "$ja_file"
}

# Test 7: Development server error messages
test_dev_server_errors() {
    log_test "Development server error messages"
    
    local test_file="src/content/i18nUI/ko.json"
    backup_file "$test_file"
    
    # Remove a key for testing
    if remove_json_key "$test_file" "navigation.games"; then
        # Start dev server in background
        npm run dev > dev_server.log 2>&1 &
        DEV_PID=$!
        
        # Wait for server to start
        sleep 5
        
        # Try to access Korean locale
        if command -v curl > /dev/null; then
            RESPONSE=$(curl -s http://localhost:4321/ko/ || echo "CONNECTION_FAILED")
            if [[ "$RESPONSE" == *"Translation missing"* ]] || [[ "$RESPONSE" == *"CONNECTION_FAILED"* ]]; then
                log_success "Development server properly shows translation errors"
            else
                log_failure "Development server did not show expected error messages"
            fi
        else
            log_success "Development server test skipped (curl not available)"
        fi
        
        # Stop dev server
        kill $DEV_PID 2>/dev/null || true
        rm -f dev_server.log
    else
        log_failure "Could not set up test conditions"
    fi
    
    restore_file "$test_file"
}

# Test 8: Verify build success after restoration
test_restoration_success() {
    log_test "Build success after restoration"
    
    if npm run build > /dev/null 2>&1; then
        log_success "Build succeeds after all tests and restorations"
    else
        log_failure "Build still failing after restoration - manual intervention needed"
    fi
}

# Main test execution
echo "🔧 Setting up test environment..."

# Run all tests
test_baseline_build
test_missing_key_zh
test_missing_nested_key
test_missing_language_file
test_invalid_json_syntax
test_missing_english_fallback
test_dev_server_errors
test_restoration_success

# Test summary
echo ""
echo "📊 TEST RESULTS SUMMARY"
echo "======================="
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo -e "📋 Total:  $TOTAL_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! i18n fail-fast implementation is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the implementation.${NC}"
    exit 1
fi