#!/usr/bin/env bash
set -euo pipefail

readonly action=$1
eval "$(bash .github/scripts/export-parameter-store-env.sh "$2" "$3")"
export COMPOSE_PROFILES=$4 VITE_API_BASE_URL=$5 COMPOSE_DISABLE_ENV_FILE=1
compose=(docker compose -f compose.yaml -f compose.s3.yaml \
  -f compose.gpu-ec2.yaml -f compose.prod.yaml)

until docker info >/dev/null 2>&1; do
  sleep 2
done

if [[ $action == active ]]; then
  "${compose[@]}" up -d --no-deps worker_maintenance celery_beat
elif [[ $action == standby ]]; then
  # RedisとCeleryのコンテナを削除・再作成
  "${compose[@]}" rm -sf broker worker_maintenance celery_beat
  "${compose[@]}" up -d --no-deps broker backend frontend worker_maintenance
  until "${compose[@]}" exec -T broker redis-cli ping 2>/dev/null | grep -qx PONG; do
    sleep 2
  done

  # RedisのSET/GET/DELを確認
  key=ocr-a-check-$$
  "${compose[@]}" exec -T broker redis-cli set "$key" ok | grep -qx OK
  test "$("${compose[@]}" exec -T broker redis-cli --raw get "$key")" = ok
  "${compose[@]}" exec -T broker redis-cli del "$key" | grep -qx 1

  # Celery Workerの起動とRedis接続を確認
  until celery_ping_output=$("${compose[@]}" exec -T worker_maintenance \
      /app/.venv/bin/python -m celery -A project.celery:app \
      inspect ping 2>/dev/null) &&
      grep -q pong <<<"$celery_ping_output"; do
    sleep 2
  done

  # health APIの200応答を確認
  until http_status=$(curl -sS -o /dev/null -w '%{http_code}' \
      http://127.0.0.1/api/health/) &&
      [[ $http_status == 200 ]]; do
    sleep 2
  done

  "${compose[@]}" stop worker_maintenance
fi
