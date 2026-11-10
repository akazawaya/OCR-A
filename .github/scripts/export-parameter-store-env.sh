#!/usr/bin/env bash

set -euo pipefail

parameter_store_path=$1
aws_region=$2

parameters=$(aws ssm get-parameters-by-path \
  --path "$parameter_store_path" \
  --recursive \
  --with-decryption \
  --region "$aws_region" \
  --query 'Parameters[*].[Name,Value]' \
  --output text)


while IFS=$'\t' read -r parameter_name parameter_value; do
  environment_name=${parameter_name##*/}

  printf 'export %q=%q\n' "$environment_name" "$parameter_value"
done <<< "$parameters"
