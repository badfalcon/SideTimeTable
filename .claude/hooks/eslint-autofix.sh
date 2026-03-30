#!/bin/bash
# ESLint auto-fix hook: runs eslint --fix on src/*.js files after edit/write
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only run on src/**/*.js files
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if printf '%s' "$FILE_PATH" | grep -q '^.*/src/.*\.js$\|^src/.*\.js$'; then
  "$CLAUDE_PROJECT_DIR/node_modules/.bin/eslint" --fix "$FILE_PATH" 2>&1 || true
fi

exit 0
