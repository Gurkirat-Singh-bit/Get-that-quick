---
sidebar_position: 1
title: Docker Deployment
---

# Docker Deployment

GetThatQuick can be deployed as a single Docker container using Docker Compose.

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
- Builds the client with Vite for production

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
- Optionally downloads `libvosk.so` for speech-to-text support
- Copies compiled client and server from the builder stage
- Runs `bun install --production` for server dependencies only
- Configures a health check that runs every 30 seconds

:::info
The `libvosk.so` installation is **optional**. If it's not available, the application still runs normally — only the speech-to-text (STT) feature will be unavailable.
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

Stops and removes the container.

---

## Data Persistence

All application data is persisted to `~/getthatquick/` on the host machine via the Docker volume mount. This includes:

- Session data and message history
- User settings and AI provider configuration
- Local templates
- Downloaded Vosk STT models

The data directory survives container rebuilds and updates.

---

## Environment Variables

| Variable   | Default | Description                                         |
| ---------- | ------- | --------------------------------------------------- |
| `PORT`     | `3000`  | Port the server listens on inside the container     |
| `DATA_DIR` | `/data` | Directory for persistent data inside the container  |
