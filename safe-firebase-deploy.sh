#!/bin/bash
set -e

ACTIVE_PROJECT=$(firebase projects:list 2>/dev/null | grep '(current)' | awk '{print $2}')

if [[ "$ACTIVE_PROJECT" == "cbrt-app-ui-dev" ]]; then
  echo "🚨 WARNING: You are targeting PRODUCTION ($ACTIVE_PROJECT)."
  echo "Add --prod to confirm, or switch with: firebase use cbrt-ui-staging"
  if [[ "$1" != "--prod" ]]; then
    echo "❌ Aborting deploy."
    exit 1
  fi
  shift
fi

firebase deploy "$@"
