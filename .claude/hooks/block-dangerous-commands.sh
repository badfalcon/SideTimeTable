#!/bin/bash
INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

# Block rm with both -r and -f flags (combined: rm -rf, rm -fr, rm -rfi, etc.)
if printf '%s' "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)'; then
  echo "Blocked: recursive forced removal is not allowed. Use safer alternatives." >&2
  exit 2
fi

# Block rm with -r and -f as separate args (rm -r -f, rm -r ... -f, etc.)
if printf '%s' "$COMMAND" | grep -qE '\brm\b' && \
   printf '%s' "$COMMAND" | grep -qE '(\s-[a-zA-Z]*r|\s--recursive)\b' && \
   printf '%s' "$COMMAND" | grep -qE '(\s-[a-zA-Z]*f|\s--force)\b'; then
  echo "Blocked: recursive forced removal is not allowed. Use safer alternatives." >&2
  exit 2
fi

# Block force push to main/master (flags in any position)
# Note: may false-positive if "main"/"master" appears in paths; this is intentional (safe-side)
if printf '%s' "$COMMAND" | grep -qE 'git\s+push\b' && \
   printf '%s' "$COMMAND" | grep -qE '(--force\b|-f\b|--force-with-lease\b)' && \
   printf '%s' "$COMMAND" | grep -qE '\b(main|master)\b'; then
  echo "Blocked: Force push to main/master is not allowed." >&2
  exit 2
fi

# Block git reset --hard
if printf '%s' "$COMMAND" | grep -qE 'git\s+reset\s+.*--hard'; then
  echo "Blocked: git reset --hard is destructive. Use git stash or git revert instead." >&2
  exit 2
fi

# Block git clean with -f flag (any position in combined flags)
# Matches: git clean -f, git clean -fd, git clean -fxd, git clean -df, git clean --force
if printf '%s' "$COMMAND" | grep -qE 'git\s+clean\s+.*(-[a-zA-Z]*f[a-zA-Z]*|--force)'; then
  echo "Blocked: git clean -f is destructive. It permanently removes untracked files." >&2
  exit 2
fi

exit 0
