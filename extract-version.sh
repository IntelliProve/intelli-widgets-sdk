#!/bin/bash

# Extract version using grep and sed
version=$(jq -r '.version' package.json)

if [[ -z "$version" ]]; then
  echo "Version not found"
  exit 1
else
  echo "$version"
  exit 0
fi
