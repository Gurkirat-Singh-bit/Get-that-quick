# ── GetThatQuick — Multi-stage Dockerfile ──────────────────────────────────
#
# Stage 1 (build):  Install deps + build the React client
# Stage 2 (runtime): Copy server + built client, run with Bun
#
# The server serves the client SPA from ../client/dist in production.
# Data is persisted at /data (mount a volume / bind-mount for persistence).

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM oven/bun:1.2 AS build

WORKDIR /app

# Copy package manifests first for layer caching
COPY client/package.json client/bun.lock* client/
COPY server/package.json server/bun.lock* server/
COPY shared/ shared/

# Install all dependencies
RUN cd /app/server && bun install --frozen-lockfile || bun install
RUN cd /app/client && bun install --frozen-lockfile || bun install

# Copy source
COPY client/ client/
COPY server/ server/

# Build the React client
RUN cd /app/client && bunx --bun vite build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM oven/bun:1.2-slim AS runtime

# Install runtime dependencies:
#   ca-certificates — HTTPS support for git clone & wget (community templates, Vosk download)
#   git             — community template sync (git clone)
#   curl            — healthcheck
#   unzip           — Vosk model extraction
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates git curl unzip && \
    rm -rf /var/lib/apt/lists/*

# Try to install libvosk (optional — STT only)
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    wget -q https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-linux-x86_64-0.3.45.zip -O /tmp/vosk.zip && \
    cd /tmp && unzip -o vosk.zip && \
    cp /tmp/vosk-linux-x86_64-0.3.45/libvosk.so /usr/lib/ && \
    ldconfig && \
    rm -rf /tmp/vosk* && \
    apt-get purge -y wget && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* || \
    echo "[docker] libvosk install skipped (STT disabled)"

WORKDIR /app

# Copy server deps + source
COPY --from=build /app/server/ server/
COPY --from=build /app/shared/ shared/

# Copy built client assets
COPY --from=build /app/client/dist/ client/dist/

# Re-install production server deps only
RUN cd /app/server && bun install --production

# Data directory — mount a volume or bind-mount here for persistence
ENV DATA_DIR=/data
RUN mkdir -p /data

# Expose the server port
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run the server
CMD ["bun", "server/src/index.ts"]
