param(
    [Parameter(Position=0)]
    [string]$RepoUrl
)

if (-not $RepoUrl) {
    Write-Host "Please enter your GitHub repository URL:" -ForegroundColor Cyan
    $RepoUrl = Read-Host "GitHub Repo URL (e.g. https://github.com/user/chess-app.git)"
}

if (-not $RepoUrl) {
    Write-Error "No repository URL provided. Aborting."
    exit 1
}

Write-Host "Staging all files in Git..." -ForegroundColor Green
git add .

Write-Host "Creating initial commit..." -ForegroundColor Green
git commit -m "feat: complete full-stack web chess app with AI, practice puzzles, multiplayer, and EC2 deployment"

Write-Host "Renaming branch to main..." -ForegroundColor Green
git branch -M main

Write-Host "Configuring remote origin..." -ForegroundColor Green
git remote remove origin 2>$null
git remote add origin $RepoUrl

Write-Host "Pushing to remote repository..." -ForegroundColor Green
git push -u origin main

Write-Host "Repository pushed successfully to $RepoUrl!" -ForegroundColor Green
