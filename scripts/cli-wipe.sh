#!/bin/bash

# CLI-based wipe script using Firebase CLI
# This uses your existing Firebase login

PROJECT=$1
if [ -z "$PROJECT" ]; then
  echo "Usage: ./scripts/cli-wipe.sh <dev|staging>"
  exit 1
fi

if [ "$PROJECT" == "dev" ]; then
  PROJECT_ID="cbrt-app-ui-dev"
elif [ "$PROJECT" == "staging" ]; then
  PROJECT_ID="cbrt-ui-staging"
else
  echo "Invalid project. Use 'dev' or 'staging'"
  exit 1
fi

echo "╔════════════════════════════════════════════╗"
echo "║         FIREBASE CLI WIPE UTILITY          ║"
echo "╠════════════════════════════════════════════╣"
echo "║  ⚠️  WARNING: DESTRUCTIVE OPERATION        ║"
echo "║  This will DELETE ALL data in:            ║"
echo "║  Project: $PROJECT_ID"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if --yes flag is provided
if [ "$2" != "--yes" ]; then
  read -p "Type 'DELETE ALL $PROJECT_ID' to confirm: " confirm
  if [ "$confirm" != "DELETE ALL $PROJECT_ID" ]; then
    echo "❌ Wipe cancelled"
    exit 0
  fi
fi

echo "🗑️  Starting wipe using Firebase CLI..."
echo ""

# Switch to the correct project
firebase use $PROJECT

# Delete Firestore data using Firebase CLI
echo "Deleting Firestore collections..."
firebase firestore:delete --all-collections --project $PROJECT_ID --force

echo ""
echo "✅ Firestore wipe complete for $PROJECT_ID"
echo ""
echo "Note: Auth and Storage must be wiped manually through Firebase Console"
echo "or with proper service account credentials."