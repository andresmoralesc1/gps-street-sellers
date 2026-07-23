#!/usr/bin/env bash
# Weekly audit script for andresmoralesc1/gps-street-sellers
# Run by cronjob (Sundays 7am Bogotá = 12:00 UTC)

set -uo pipefail

REPO_ROOT="/home/telchar/gps-street-sellers"
cd "$REPO_ROOT" || exit 1
DATE=$(date +%Y-%m-%d)
REPORT_DIR="$REPO_ROOT/.hermes/reports/weekly-audit-$DATE"
mkdir -p "$REPORT_DIR"

echo "🔍 Weekly audit started at $(date -u +%FT%TZ)"
echo "   Repo: $REPO_ROOT"
echo "   Branch: $(git branch --show-current)"
echo "   HEAD: $(git rev-parse --short HEAD)"
echo "   Last commit: $(git log -1 --format='%s' HEAD)"
echo "---"

# 1. Working tree clean check
DIRTY=$(git status --short | wc -l)
echo "Working tree files dirty: $DIRTY"
if [ "$DIRTY" -gt 0 ]; then
  echo "⚠️  Uncommitted files:"
  git status --short | head -10
fi
echo "---"

# 2. Remote in sync check
git fetch origin --quiet 2>&1 | head -3 || true
AHEAD=$(git log --oneline origin/main..main 2>/dev/null | wc -l)
BEHIND=$(git log --oneline main..origin/main 2>/dev/null | wc -l)
echo "Local commits ahead of origin: $AHEAD"
echo "Local commits behind origin: $BEHIND"
echo "---"

# 3. tsc check (must run from apps/web — monorepo cwd trap)
cd "$REPO_ROOT/apps/web" || exit 1
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 | tail -20)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo 0)
TSC_ERRORS=$(echo "$TSC_ERRORS" | tail -1)
echo "TypeScript errors: $TSC_ERRORS"
if [ "${TSC_ERRORS:-0}" -gt 0 ] 2>/dev/null; then
  echo "Sample errors:"
  echo "$TSC_OUTPUT" | head -10
fi
echo "---"

# 4. npm audit (production only)
NPM_CRITICAL="null"
NPM_HIGH="null"
if command -v jq >/dev/null; then
  NPM_AUDIT=$(npm audit --production --json 2>/dev/null || true)
  if [ -n "$NPM_AUDIT" ]; then
    NPM_CRITICAL=$(printf '%s' "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.critical // "null"' 2>/dev/null || echo "null")
    NPM_HIGH=$(printf '%s' "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.high // "null"' 2>/dev/null || echo "null")
  fi
fi
echo "Production vulnerabilities: critical=$NPM_CRITICAL high=$NPM_HIGH"
echo "---"

# 5. API health
SITE="http://127.0.0.1:3005"
echo "API health probe:"
for endpoint in "/" "/api/vendors" "/api/cities" "/api/stats" "/sitemap.xml"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$SITE$endpoint" || echo "fail")
  echo "  $endpoint → $STATUS"
done
echo "---"

# 6. Vendor data sanity (vendor count vs contact-log volume)
cd "$REPO_ROOT" || exit 1
PGPASSWORD=postgres psql -h localhost -U postgres -d gps_street_sellers -c "
  SELECT
    (SELECT COUNT(*) FROM vendors WHERE is_active = true) as active_vendors,
    (SELECT COUNT(*) FROM vendor_contacts WHERE created_at > NOW() - INTERVAL '7 days') as contacts_7d,
    (SELECT COUNT(*) FROM vendors WHERE created_at > NOW() - INTERVAL '7 days') as new_vendors_7d,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours') as stale_pending_orders;
" 2>&1 | head -20
echo "---"

# 7. Write JSON report
SUMMARY_JSON="$REPORT_DIR/summary.json"
cat > "$SUMMARY_JSON" <<EOF
{
  "date": "$DATE",
  "head": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "working_tree_dirty": $DIRTY,
  "ahead_origin": $AHEAD,
  "behind_origin": $BEHIND,
  "tsc_errors": ${TSC_ERRORS:-0},
  "npm_audit_critical": "$NPM_CRITICAL",
  "npm_audit_high": "$NPM_HIGH"
}
EOF

echo "✅ Summary written to $SUMMARY_JSON"
echo "Weekly audit finished at $(date -u +%FT%TZ)"