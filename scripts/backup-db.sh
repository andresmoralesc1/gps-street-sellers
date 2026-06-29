#!/usr/bin/env bash
#
# Backup the BarrioTech PostgreSQL database with pg_dump.
#
# Features:
#   - Timestamped dump files (gps_street_sellers_YYYY-MM-DD_HHMMSS.sql.gz)
#   - Configurable retention (default: keep 7 daily + 4 weekly)
#   - Optional S3 upload (set BACKUP_S3_BUCKET)
#   - Logs size + duration, exits non-zero on failure
#
# Usage:
#   ./scripts/backup-db.sh                # default config from .env
#   BACKUP_DIR=/var/backups/gps ./scripts/backup-db.sh
#   BACKUP_KEEP_DAILY=14 ./scripts/backup-db.sh
#
# Cron (3am daily):
#   0 3 * * * /home/telchar/gps-street-sellers/scripts/backup-db.sh >> /var/log/gps-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/apps/web/.env"

# Source .env so cron jobs (which run with a minimal env) can see DB creds.
# We only pick up PG/DB style vars; everything else is left untouched.
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Map common DB_* vars to PG* so the script works with both naming schemes.
PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
PGPORT="${PGPORT:-${DB_PORT:-5432}}"
PGUSER="${PGUSER:-${DB_USER:-postgres}}"
PGDATABASE="${PGDATABASE:-${DB_NAME:-gps_street_sellers}}"
export PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-}}"

if [[ -z "$PGPASSWORD" ]]; then
  echo "[backup] FAIL — neither PGPASSWORD nor DB_PASSWORD set (check $ENV_FILE)" >&2
  exit 1
fi

# Defaults that can be overridden AFTER .env sourcing.
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
BACKUP_KEEP_DAILY="${BACKUP_KEEP_DAILY:-7}"
BACKUP_KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-4}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}" # empty = skip upload

mkdir -p "$BACKUP_DIR"

# ---- Run --------------------------------------------------------------------

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
FILENAME="${PGDATABASE}_${TIMESTAMP}.sql.gz"
TARGET="$BACKUP_DIR/$FILENAME"
START_TS=$(date +%s)

echo "[backup] starting at $(date -Iseconds)"
echo "[backup] target: $TARGET"

# pg_dump --no-owner --no-privileges: skip role/permission lines so the dump
# is portable to a fresh DB without recreating roles.
if ! pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --user="$PGUSER" \
    --dbname="$PGDATABASE" \
    --no-owner \
    --no-privileges \
    --format=plain \
    --clean \
    --if-exists \
    | gzip -9 > "$TARGET"; then
  echo "[backup] FAIL — pg_dump exited non-zero" >&2
  rm -f "$TARGET"  # don't keep a corrupted dump
  exit 1
fi

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))
SIZE=$(stat -c%s "$TARGET" 2>/dev/null || stat -f%z "$TARGET")
SIZE_MB=$(awk "BEGIN { printf \"%.2f\", $SIZE / 1024 / 1024 }")

echo "[backup] OK — ${SIZE_MB} MB in ${DURATION}s"

# ---- Optional S3 upload -----------------------------------------------------

if [[ -n "$BACKUP_S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
  S3_KEY="db-backups/$FILENAME"
  if aws s3 cp "$TARGET" "s3://$BACKUP_S3_BUCKET/$S3_KEY" --storage-class STANDARD_IA; then
    echo "[backup] uploaded to s3://$BACKUP_S3_BUCKET/$S3_KEY"
  else
    echo "[backup] WARN — S3 upload failed (local copy is still safe)" >&2
  fi
fi

# ---- Retention: keep N most-recent daily + weekly files ---------------------

# Daily: delete files older than the Nth most-recent.
DAILY_TO_DELETE=$(find "$BACKUP_DIR" -maxdepth 1 -name "${PGDATABASE}_*.sql.gz" -type f -printf '%T@\t%p\n' \
  | sort -rn \
  | tail -n +$((BACKUP_KEEP_DAILY + 1)) \
  | cut -f2-)

if [[ -n "$DAILY_TO_DELETE" ]]; then
  echo "[backup] pruning $(echo "$DAILY_TO_DELETE" | wc -l) daily file(s) beyond retention"
  echo "$DAILY_TO_DELETE" | xargs -r rm -f
fi

# Weekly: tag the most recent file of each ISO week with .weekly, keep N of those.
# Cheap heuristic: tag any backup made on Sunday as a weekly anchor.
for f in "$BACKUP_DIR"/${PGDATABASE}_*.sql.gz; do
  [[ -f "$f" ]] || continue
  filename=$(basename "$f")
  # Extract date from filename: PGDATABASE_YYYY-MM-DD_HHMMSS.sql.gz
  date_part=$(echo "$filename" | sed -E "s/${PGDATABASE}_([0-9-]+)_[0-9]+\.sql\.gz/\1/")
  day_of_week=$(date -d "$date_part" +%u 2>/dev/null || echo 0)
  if [[ "$day_of_week" == "7" ]]; then  # Sunday
    [[ -f "${f}.weekly" ]] || cp "$f" "${f}.weekly"
  fi
done

WEEKLY_TO_DELETE=$(find "$BACKUP_DIR" -maxdepth 1 -name "${PGDATABASE}_*.sql.gz.weekly" -type f -printf '%T@\t%p\n' \
  | sort -rn \
  | tail -n +$((BACKUP_KEEP_WEEKLY + 1)) \
  | cut -f2-)

if [[ -n "$WEEKLY_TO_DELETE" ]]; then
  echo "[backup] pruning $(echo "$WEEKLY_TO_DELETE" | wc -l) weekly file(s) beyond retention"
  echo "$WEEKLY_TO_DELETE" | xargs -r rm -f
fi

echo "[backup] done. Files remaining: $(find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz*" -type f | wc -l)"