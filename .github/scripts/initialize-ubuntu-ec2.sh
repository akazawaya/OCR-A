#!/usr/bin/env bash

set -euo pipefail

host_type=$1
instance_id=$2

deploy_key=/root/.ssh/ocr_a_deploy_key
project_dir=/opt/ocr-a

export DEBIAN_FRONTEND=noninteractive

echo "Installing Docker Engine and Docker Compose..."
install -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

. /etc/os-release
architecture=$(dpkg --print-architecture)
printf '%s\n' \
  "deb [arch=$architecture signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  docker-ce \
  docker-buildx-plugin \
  docker-compose-plugin

if ! command -v aws >/dev/null 2>&1; then
  echo "Installing AWS CLI..."
  snap install aws-cli --classic
fi

if [[ "$host_type" == "gpu" ]]; then
  echo "Installing the NVIDIA driver..."
  apt-get install -y -qq ubuntu-drivers-common
  ubuntu-drivers --gpgpu install

  echo "Installing NVIDIA Container Toolkit..."
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | gpg --dearmor \
      -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  echo 'deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list

  apt-get update -qq
  apt-get install -y -qq nvidia-container-toolkit
  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker
fi

echo "Preparing the deployment directory and read-only deploy key..."
install -d "$(dirname "$project_dir")"
install -d /root/.ssh

ssh-keygen \
  -q \
  -t ed25519 \
  -N '' \
  -C "ocr-a-$instance_id" \
  -f "$deploy_key"

curl -fsSL https://api.github.com/meta \
  | jq -r '.ssh_keys[] | "github.com " + .' \
  > /root/.ssh/known_hosts

echo
echo "Initialization completed. Register this as a read-only GitHub Deploy Key:"
cat "$deploy_key.pub"

if [[ "$host_type" == "gpu" ]] && ! nvidia-smi >/dev/null 2>&1; then
  echo
  echo "The instance will reboot in one minute to load the NVIDIA driver."
  shutdown -r +1
fi
