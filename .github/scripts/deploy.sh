#!/usr/bin/env bash
set -euo pipefail

readonly deployment_profile=$1 aws_region=$2 role_parameter_name=$3
export COMPOSE_DISABLE_ENV_FILE=1

export COMPOSE_PROFILES=$deployment_profile
if [[ $deployment_profile == production-cpu ]]; then
  compose=(docker compose -f compose.yaml -f compose.s3.yaml \
    -f compose.gpu-ec2.yaml -f compose.prod.yaml)
else
  compose=(docker compose -f compose.yaml -f compose.s3.yaml \
    -f compose.prod.yaml)
  # gpuのデプロイはgpu_workerが動いていない(OCRタスクが存在しない)ことを確認してから、
  # 前回のイメージ等を削除し、容量を確保してから再度ビルドを実行する
  mapfile -t gpu_container_ids < <("${compose[@]}" ps -q)

  if (( ${#gpu_container_ids[@]} > 0 )); then
    gpu_container_id=${gpu_container_ids[0]}
    echo "Checking GPU OCR queues from container: $gpu_container_id"
    if ! docker exec -i "$gpu_container_id" \
      /app/.venv/bin/python manage.py shell \
      < .github/scripts/assert-gpu-worker-idle.py; then
      echo "GPU OCR work exists; cleanup was skipped and deployment was aborted." >&2
      exit 1
    fi

    echo "Stopping GPU containers: ${gpu_container_ids[*]}"
    docker stop --time 60 "${gpu_container_ids[@]}"
  else
    echo "No running GPU container found; proceeding with Docker cleanup."
  fi

  # volumeは消さず、停止中コンテナ、未使用イメージ、ビルドキャッシュを消す。
  docker system prune --all --force
  df -h /
  docker system df

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
