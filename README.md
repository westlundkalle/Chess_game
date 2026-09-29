# ♟️ Grandmaster Arena - Full-Stack Web Chess Platform

A modern, production-ready web-based chess application featuring **Play Against Stockfish AI**, an interactive **Tactical Practice Mode**, and real-time **Multiplayer** synchronization with room codes. Fully containerized with Docker and ready for one-click deployment to AWS EC2.

---

## 🌟 Key Features

1. **Play Against AI**
   - Integrated with official **Stockfish.js** running in a dedicated background **Web Worker** to guarantee 60 FPS UI performance.
   - 5 selectable difficulty presets:
     - **Beginner (~800)**: Skill 1, Depth 2
     - **Casual (~1200)**: Skill 5, Depth 5
     - **Intermediate (~1600)**: Skill 10, Depth 8
     - **Advanced (~2000)**: Skill 15, Depth 12
     - **Grandmaster (2600+)**: Skill 20, Depth 18
   - Side selection (White / Black), board flipping, undo/reset, and captured material advantage counter.

2. **Practice Mode (Tactical Puzzles)**
   - Pre-loaded curated puzzles spanning themes like *Back-Rank Mate*, *Royal Fork*, *Deflection*, *Skewer*, and *Queen Sacrifices*.
   - Move validation against puzzle solutions:
     - Correct moves trigger automatic opponent responses with realistic delays.
     - Incorrect moves prompt instant feedback to try again.
     - Interactive hints and full solution walkthroughs.

3. **Real-Time Multiplayer (Play a Friend)**
   - Generate unique 6-character alphanumeric room codes (e.g. `AB49K2`).
   - Private room creation and joining via **Socket.io**.
   - Automatic side assignment: Host is assigned White (or chosen color), first guest is assigned Black, subsequent users join as spectators.
   - Real-time board state synchronization (`chess.js` FEN) across all connected clients.
   - In-game live chat box, resignation handling, and rematch requests (colors swap on rematch).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, `react-chessboard`, `chess.js`, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, `Socket.io`, `chess.js`.
- **AI Engine**: `stockfish.js` WebAssembly build running via UCI protocol in a Web Worker.
- **DevOps**: Docker, Docker Compose, Nginx reverse proxy, Git, and automated AWS EC2 shell deployment.

---

## 📁 Repository Structure

```
Chess_Game/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app & Socket.io server bootstrap
│   │   ├── gamesManager.js        # In-memory room store & game state engine
│   │   └── socketHandler.js       # Real-time room events, moves, & chat
│   ├── test/
│   │   └── test.js                # Backend unit tests
│   ├── Dockerfile                 # Production Node 20 Alpine container
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── stockfish/             # Stockfish JS/WASM engine files
│   ├── src/
│   │   ├── components/            # ChessBoardView, Navbar, MoveHistory, etc.
│   │   ├── data/
│   │   │   └── puzzles.json       # Curated tactical puzzle database
│   │   ├── hooks/
│   │   │   ├── useStockfish.js    # Web Worker UCI Stockfish integration
│   │   │   └── useSocket.js       # Socket.io client synchronization hook
│   │   ├── pages/                 # AiModePage, PracticeModePage, MultiplayerPage
│   │   ├── utils/
│   │   │   └── sound.js           # Synthesized Web Audio API sound effects
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile                 # Multi-stage Vite build + Nginx SPA server
│   ├── nginx.conf                 # Container Nginx config
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml             # Orchestration for frontend & backend
├── nginx.conf                     # Standalone Nginx reverse proxy template for EC2
├── deploy.sh                      # Automated Ubuntu AWS EC2 deployment script
├── push_to_github.sh / .ps1       # Scripts to commit and push to your GitHub repo
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or v20+)
- npm or yarn

### 1. Run the Backend
```bash
cd backend
npm install
npm start
# Server starts on http://localhost:5000
```

To run backend tests:
```bash
npm test
```

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:3000
```

Open `http://localhost:3000` in your browser. The Vite dev server will automatically proxy `/socket.io` and API requests to `http://localhost:5000`.

---

## 🐳 Running with Docker Compose Locally

You can spin up the full production stack with a single command:

```bash
docker compose up -d --build
```

Access the app at:
- **Frontend & App**: `http://localhost` (Port 80)
- **Backend API**: `http://localhost:5000/health`

To stop the containers:
```bash
docker compose down
```

---

## ☁️ AWS EC2 Deployment Guide

### Step 1: Launch an EC2 Instance
1. Go to **AWS Console → EC2 → Launch Instance**.
2. Select **Ubuntu Server 22.04 LTS (HVM)** or **Ubuntu 24.04 LTS**.
3. Choose instance type (e.g. `t2.micro` or `t3.micro` for free tier, or `t3.small`).
4. In **Network Settings (Security Groups)**, allow inbound traffic for:
   - **SSH (Port 22)**: From your IP
   - **HTTP (Port 80)**: From `0.0.0.0/0` (Anywhere)
   - **Custom TCP (Port 5000)** *(Optional, if accessing backend directly)*: From `0.0.0.0/0`

### Step 2: Deploy Using `deploy.sh`
Connect to your EC2 instance via SSH:
```bash
ssh -i your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

Clone your repository and run the deployment script:
```bash
git clone <YOUR-GITHUB-REPO-URL> Chess_Game
cd Chess_Game
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
1. Update system packages.
2. Install Docker and Docker Compose.
3. Build the backend and frontend Docker containers.
4. Launch the services in the background and verify health checks.

Open `http://<YOUR-EC2-PUBLIC-IP>` in your browser to play!

---

## 📤 Pushing to GitHub

When ready to link and push your code to your remote GitHub repository:

### Option A: Using the Bash helper (Linux/Mac/Git Bash)
```bash
./push_to_github.sh https://github.com/<your-username>/<your-repo-name>.git
```

### Option B: Using PowerShell (Windows)
```powershell
.\push_to_github.ps1 https://github.com/<your-username>/<your-repo-name>.git
```

### Option C: Manual Git Commands
```bash
git add .
git commit -m "feat: complete full-stack web chess app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```
