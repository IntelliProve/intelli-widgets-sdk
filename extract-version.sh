#!/bin/bash

# Path to your JavaScript file
file_path="$1" # Change this to the path of your JS file

# Extract version using grep and sed
version=$(grep "@version [0-9]\.[0-9]\.[0-9]" -o "$1" | sed 's/@version //')

if [[ -z "$version" ]]; then
  echo "Version not found"
  exit 1
else
  echo "$version"
  exit 0
fi
