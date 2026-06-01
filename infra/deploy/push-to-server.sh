#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST, for example 193.112.176.242}"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/gesp-catalog}"
ENV_FILE="${ENV_FILE:-.env.prod}"
SEED_ON_DEPLOY="${SEED_ON_DEPLOY:-false}"
RSYNC_DELETE="${RSYNC_DELETE:-false}"
SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

SSH_ARGS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
fi

RSYNC_SSH="ssh -o StrictHostKeyChecking=accept-new"
if [[ -n "${SSH_KEY:-}" ]]; then
  RSYNC_SSH="ssh -o StrictHostKeyChecking=accept-new -i $SSH_KEY"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing local $ENV_FILE. Copy .env.prod.example to $ENV_FILE and set production passwords first." >&2
  exit 1
fi

RSYNC_ARGS=(-az)
if [[ "$RSYNC_DELETE" == "true" ]]; then
  RSYNC_ARGS+=(--delete)
fi

ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "mkdir -p '$DEPLOY_PATH'"

EXCLUDES=(
  --exclude .git
  --exclude node_modules
  --exclude dist
  --exclude .workflow
  --exclude .python-deps
  --exclude '*.log'
)

if command -v rsync >/dev/null 2>&1 && ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "command -v rsync >/dev/null 2>&1"; then
  rsync "${RSYNC_ARGS[@]}" "${EXCLUDES[@]}" -e "$RSYNC_SSH" ./ "$SSH_TARGET:$DEPLOY_PATH/"
else
  tar -czf - "${EXCLUDES[@]}" . | ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "tar -xzf - -C '$DEPLOY_PATH'"
fi

ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
  "cd '$DEPLOY_PATH' && ENV_FILE='$ENV_FILE' SEED_ON_DEPLOY='$SEED_ON_DEPLOY' bash infra/deploy/deploy-prod.sh"
