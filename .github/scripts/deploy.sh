#!/usr/bin/env bash
set -euo pipefail

readonly deployment_profile=$1 aws_region=$2 role_parameter_name=$3
export COMPOSE_DISABLE_ENV_FILE=1

export COMPOSE_PROFILES=$deployment_profile
if [[ $deployment_profile == production-cpu ]]; then
  compose=(docker compose -f compose.yaml -f compose.s3.yaml \
    -f compose.gpu-ec2.yaml -f compose.prod.yaml)
else
  # gpuのデプロイの場合はこのブロックで完結。
  compose=(docker compose -f compose.yaml -f compose.s3.yaml \
    -f compose.prod.yaml)
  "${compose[@]}" up -d --build
  exit 0
fi

# IMDSv2で実行先EC2自身を特定する。
metadata_token=$(curl -fsS --connect-timeout 3 --max-time 10 \
  -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
  http://169.254.169.254/latest/api/token)
instance_id=$(curl -fsS --connect-timeout 3 --max-time 10 \
  -H "X-aws-ec2-metadata-token: $metadata_token" \
  http://169.254.169.254/latest/meta-data/instance-id)
unset metadata_token

read_redis_role() {
  local role_state
  role_state=$(aws ssm get-parameter --region "$aws_region" \
    --name "$role_parameter_name" --query Parameter.Value --output text) || return
  jq -er --arg instance_id "$instance_id" '
    if type == "object" and length == 2 and
       (([.[]] | sort) == ["active", "standby"] or
        ([.[]] | sort) == ["active", "fenced"])
    then .[$instance_id] // error("Instance is missing from Role State")
    else error("Invalid Role State") end
  ' <<< "$role_state"
}

redis_role=$(read_redis_role)
if [[ $redis_role == fenced ]]; then
  echo "Skip fenced instance: $instance_id"
  exit 0
fi
if [[ $redis_role == standby ]]; then
  "${compose[@]}" stop celery_beat
fi

# standbyにも昇格時に必要なBeatのイメージを用意する。
"${compose[@]}" build
"${compose[@]}" run --rm --no-deps -T backend /app/.venv/bin/python - < .github/scripts/ensure-postgres-database.py
"${compose[@]}" run --rm --no-deps backend /app/.venv/bin/python manage.py migrate --noinput
"${compose[@]}" run --rm --no-deps backend /app/.venv/bin/python manage.py collectstatic --noinput

# ビルド中の役割変更を検知したら中止する。Lambdaとの排他ロックではない。
current_role=$(read_redis_role)
if [[ $current_role != "$redis_role" ]]; then
  echo "Role changed during CD; aborting" >&2
  exit 1
fi

"${compose[@]}" up -d broker backend frontend worker_maintenance
if [[ $current_role == active ]]; then
  "${compose[@]}" up -d --no-deps celery_beat
else
  "${compose[@]}" stop celery_beat
fi
