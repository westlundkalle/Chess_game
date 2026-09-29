#!/usr/bin/env bash
# ==============================================================================
# Grandmaster Arena - Automated AWS EC2 (Ubuntu) Deployment Script
# ==============================================================================
set -e

echo "=========================================================="
echo " Starting Grandmaster Arena Deployment on AWS EC2..."
echo "=========================================================="

# 1. Update system packages
echo "[1/5] Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "[2/5] Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker

    # Add current user to docker group
    sudo usermod -aG docker "$USER"
    echo "Docker installed successfully."
else
    echo "[2/5] Docker is already installed."
fi

# 3. Verify Docker Compose
echo "[3/5] Verifying Docker Compose..."
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "Installing Docker Compose standalone..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    COMPOSE_CMD="docker-compose"
fi

echo "Using compose command: $COMPOSE_CMD"

# 4. Clone or pull repository
REPO_DIR="$HOME/Chess_Game"
if [ -d "$REPO_DIR/.git" ]; then
    echo "[4/5] Pulling latest updates from Git..."
    cd "$REPO_DIR"
    git pull origin main || git pull origin master || true
else
    echo "[4/5] Working in current directory: $(pwd)..."
    REPO_DIR="$(pwd)"
fi

cd "$REPO_DIR"

# 5. Build and launch containers
echo "[5/5] Building and launching containers..."
sudo $COMPOSE_CMD down || true
sudo $COMPOSE_CMD up -d --build

echo "=========================================================="
echo " Deployment Complete!"
echo "=========================================================="
echo "Checking running containers:"
sudo $COMPOSE_CMD ps

echo ""
echo "Health check:"
sleep 5
curl -s http://localhost:5000/health || echo "Waiting for backend to be fully ready..."

echo ""
echo "Your Chess Application is running on Port 80 (HTTP)!"
echo "Access it in your browser at: http://<EC2-PUBLIC-IP>"
