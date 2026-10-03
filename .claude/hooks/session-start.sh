#!/bin/bash
# Cloud sessions start from a fresh clone: install deps so typecheck/lint/tests work immediately.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1 || true
echo "Read HANDOVER.md first. Local Supabase: start dockerd, then 'npm run db:start' (see MEMORY.md)."
