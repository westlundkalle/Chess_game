#!/bin/bash
set -e

# Redirect output for logging and troubleshooting
exec > >(tee -a /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Starting Automated Grandmaster Chess Server Provisioning ==="

# 1. Update system packages
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Install official Docker and Docker Compose plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# 3. Clone application repository from GitHub
APP_DIR="/home/ubuntu/Chess_game"
echo "Cloning application from ${repo_url} into $APP_DIR..."
rm -rf "$APP_DIR"
git clone "${repo_url}" "$APP_DIR"

cd "$APP_DIR"
chown -R ubuntu:ubuntu "$APP_DIR"

# 4. Spin up Docker containers (Frontend, Backend, and WebSocket reverse proxy)
echo "Spinning up Docker containers via Docker Compose..."
docker compose up -d --build

echo "=== Grandmaster Chess Deployment Completed Successfully on Port 80 ==="
