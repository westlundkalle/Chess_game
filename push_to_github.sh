#!/usr/bin/env bash
# ==============================================================================
# Helper Script: Initialize, Commit, and Push Chess Game to GitHub
# ==============================================================================
set -e

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
    echo "Usage: ./push_to_github.sh <GITHUB_REPO_URL>"
    echo "Example: ./push_to_github.sh https://github.com/username/chess-app.git"
    echo ""
    read -p "Enter your GitHub repository URL: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
    echo "Error: No repository URL provided. Aborting."
    exit 1
fi

echo "Adding changes to Git..."
git add .

echo "Creating commit..."
git commit -m "feat: complete full-stack web chess app with AI, practice puzzles, multiplayer, and EC2 deployment" || echo "No new changes to commit."

echo "Configuring main branch..."
git branch -M main

echo "Setting remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "Successfully pushed to $REPO_URL!"
