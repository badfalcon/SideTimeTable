#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block exact .env files (not substrings like "environment")
BASENAME=$(basename "$FILE_PATH")
if [[ "$BASENAME" == ".env" ]] || [[ "$BASENAME" == .env.* ]]; then
  echo "Blocked: $FILE_PATH is a protected environment file" >&2
  exit 2
fi

# Block specific protected paths
PROTECTED_PATHS=("package-lock.json" ".git/" "node_modules/" "dist/")
for pattern in "${PROTECTED_PATHS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done

exit 0
