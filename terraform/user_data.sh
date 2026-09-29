#!/usr/bin/env bash
# ==============================================================================
# Cloud-init User Data Script for AWS EC2 (Ubuntu)
# Automatically installs Docker, clones the repository, and starts the Chess app.
# ==============================================================================
set -e

# Redirect stdout and stderr to a log file for debugging
exec > >(tee -a /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting automated EC2 deployment via Terraform user_data..."

# 1. Update and install prerequisites
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Install Docker
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

# 3. Clone and launch Chess application
APP_DIR="/home/ubuntu/Chess_game"

if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/westlundkalle/Chess_game.git "$APP_DIR"
fi

cd "$APP_DIR"
chown -R ubuntu:ubuntu "$APP_DIR"

# Launch Docker containers
docker compose up -d --build

echo "Grandmaster Arena successfully deployed and listening on Port 80!"
