#!/bin/bash

# Repository Hygiene Check Script
# Run this before committing to ensure repository cleanliness

echo "🔍 Running repository hygiene checks..."

# Check for foreign framework files
echo -n "Checking for foreign frameworks... "
if [ -f "next.config.js" ] || [ -f "angular.json" ] || [ -d "apps/" ] || [ -d "packages/" ]; then
    echo "❌ FAILED"
    echo "Found foreign framework files or directories"
    exit 1
fi
echo "✅ OK"

# Check for multiple package.json files
echo -n "Checking for single package.json... "
count=$(find . -name "package.json" -not -path "./node_modules/*" -not -path "./_foreign/*" -type f | wc -l)
if [ "$count" -gt 1 ]; then
    echo "❌ FAILED"
    echo "Found $count package.json files (expected 1)"
    find . -name "package.json" -not -path "./node_modules/*" -not -path "./_foreign/*" -type f
    exit 1
fi
echo "✅ OK"

# Check for single Firebase initialization
echo -n "Checking Firebase initialization... "
if [ -d "src/" ]; then
    # Look for actual initialization calls (not imports)
    count=$(grep -r "initializeApp(" src/ --exclude-dir=node_modules 2>/dev/null | grep -v "^.*import.*initializeApp" | wc -l)
    if [ "$count" -gt 1 ]; then
        echo "❌ FAILED"
        echo "Found $count Firebase initialization calls (expected 1)"
        exit 1
    fi
fi
echo "✅ OK"

# Check for temp files and logs
echo -n "Checking for temporary files... "
if ls *.log >/dev/null 2>&1 || ls temp_* >/dev/null 2>&1; then
    echo "⚠️  WARNING"
    echo "Found temporary files that should be cleaned up:"
    ls *.log temp_* 2>/dev/null || true
else
    echo "✅ OK"
fi

echo ""
echo "✨ All hygiene checks passed!"
echo "Repository is clean and ready for commit."