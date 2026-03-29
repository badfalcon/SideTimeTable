#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block rm -rf
if echo "$COMMAND" | grep -qE 'rm\s+-rf'; then
  echo "Blocked: rm -rf is not allowed. Use safer alternatives." >&2
  exit 2
fi

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force.*(main|master)|git\s+push\s+-f.*(main|master)'; then
  echo "Blocked: Force push to main/master is not allowed." >&2
  exit 2
fi

# Block git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "Blocked: git reset --hard is destructive. Use git stash or git revert instead." >&2
  exit 2
fi

exit 0
