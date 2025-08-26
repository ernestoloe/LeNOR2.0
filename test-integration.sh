#!/bin/bash
set -e

echo "Running LéNOR integration checks..."

if ! npm list --depth=0 >/dev/null; then
  echo "Dependency check failed"
  exit 1
fi

echo "Dependency check passed."
