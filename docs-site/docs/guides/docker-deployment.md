---
sidebar_position: 1
title: Docker Deployment
---

# Docker Deployment

GetThatQuick runs as a single Docker container. The easiest way to deploy it is with the one-liner installer or Docker Compose.

---

## One-liner Install

The install scripts handle everything — checking prerequisites, installing git and Docker if missing, cloning the repo, and starting the app.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.sh | sh
```

### Windows (PowerShell — run as Administrator)

```powershell
irm https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.ps1 | iex
```

What each script does:
1. Detects your OS
2. Installs **git** if not present (via package manager / winget)
3. Installs **Docker** if not present (via get.docker.com / Docker Desktop)
4. Waits for the Docker daemon to be ready
5. Clones (or updates) the repo to `~/GetThatQuick`
6. Runs `docker compose up --build -d`
7. Prints the access URL

The app will be available at **http://localhost:12233**.

---

## Manual Docker Compose

If you already have git and Docker:

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick
docker compose up --build -d
```

---

## Docker Compose Configuration

The `docker-compose.yml` at the project root defines the service:

```yaml
services:
  app:
    build: .
    container_name: getthatquick
    ports:
      - "12233:3000"
    volumes:
      - ~/getthatquick:/data
    environment:
      - PORT=3000
      - DATA_DIR=/data
    restart: unless-stopped
```

| Setting              | Value                  | Description                                 |
| -------------------- | ---------------------- | ------------------------------------------- |
| Container name       | `getthatquick`         | Fixed container name                        |
| External port        | `12233`                | Host port mapped to the container           |
| Internal port        | `3000`                 | Application port inside the container       |
| Data volume          | `~/getthatquick:/data` | Persistent storage on the host              |
| Restart policy       | `unless-stopped`       | Auto-restart unless explicitly stopped      |

---

## Dockerfile

The Dockerfile uses a **multi-stage build**:

### Stage 1: Builder

```dockerfile
FROM oven/bun:1.2
# Install all dependencies
# Build the client (Vite production build)
```

- Base image: `oven/bun:1.2`
- Installs all dependencies (client + server + shared)
- Builds the React client with Vite for production

### Stage 2: Runtime

```dockerfile
FROM oven/bun:1.2-slim
# Install system dependencies (git, curl, unzip)
# Optionally download libvosk.so
# Copy build artifacts from builder
# Install production-only dependencies
# Health check every 30s
```

- Base image: `oven/bun:1.2-slim` (smaller runtime image)
- Installs system utilities: `git`, `curl`, `unzip`
- Optionally downloads `libvosk.so` for local speech-to-text support
- Copies compiled client and server from the builder stage
- Runs `bun install --production` for server dependencies only
- Configures a health check that runs every 30 seconds

:::info
The `libvosk.so` installation is **optional**. If it's not available, the application still runs normally — only the local Vosk STT feature will be unavailable. You can still use [Cloud STT](./cloud-stt.md) (Groq or OpenAI Whisper).
:::

---

## Commands

### Build and Start

```bash
docker compose up --build -d
```

Builds the image and starts the container in detached mode.

### View Logs

```bash
docker compose logs -f
```

Follow container logs in real-time.

### Stop

```bash
docker compose down
```

Stops and removes the container. Data is preserved in `~/getthatquick/`.

### Update to Latest

```bash
git pull && docker compose up --build -d
```

Pulls latest code and rebuilds the image.

---

## Data Persistence

All application data is persisted to `~/getthatquick/` on the host machine via the Docker volume mount. This includes:

- Session data and message history
- User settings and AI provider configuration (including API keys)
- Local templates
- Downloaded Vosk STT models

The data directory survives container rebuilds and updates.

---

## Environment Variables

| Variable   | Default | Description                                         |
| ---------- | ------- | --------------------------------------------------- |
| `PORT`     | `3000`  | Port the server listens on inside the container     |
| `DATA_DIR` | `/data` | Directory for persistent data inside the container  |
