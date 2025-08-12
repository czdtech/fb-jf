#!/bin/bash

# Quick Test Runner for i18n Fail-Fast Implementation
# Usage: ./quick-test.sh [test-type]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 i18n Fail-Fast Quick Test Runner${NC}"
echo "=================================="

# Test type selection
TEST_TYPE=${1:-"all"}

case $TEST_TYPE in
    "baseline"|"build")
        echo -e "${YELLOW}📋 Running baseline build test...${NC}"
        npm run build && echo -e "${GREEN}✅ Build successful${NC}" || echo -e "${RED}❌ Build failed${NC}"
        ;;
    "validation"|"validate")
        echo -e "${YELLOW}📋 Running translation validation...${NC}"
        node tests/validate-translations.js
        ;;
    "integration"|"full")
        echo -e "${YELLOW}📋 Running full integration tests...${NC}"
        node tests/integration-test.js
        ;;
    "manual")
        echo -e "${YELLOW}📋 Opening manual test checklist...${NC}"
        echo "Please follow the manual testing checklist in tests/manual-testing-checklist.md"
        ;;
    "all"|*)
        echo -e "${YELLOW}📋 Running all automated tests...${NC}"
        echo ""
        
        echo -e "${YELLOW}Step 1: Translation validation${NC}"
        node tests/validate-translations.js || { echo -e "${RED}❌ Translation validation failed${NC}"; exit 1; }
        echo ""
        
        echo -e "${YELLOW}Step 2: Baseline build${NC}"  
        npm run build || { echo -e "${RED}❌ Baseline build failed${NC}"; exit 1; }
        echo ""
        
        echo -e "${YELLOW}Step 3: Integration tests${NC}"
        node tests/integration-test.js || { echo -e "${RED}❌ Integration tests failed${NC}"; exit 1; }
        echo ""
        
        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
        ;;
esac