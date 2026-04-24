#!/usr/bin/env sh
# GetThatQuick — One-liner installer for Linux & macOS
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.sh | sh

set -e

REPO_URL="https://github.com/Gurkirat-Singh-bit/Get-that-quick.git"
INSTALL_DIR="$HOME/GetThatQuick"
PORT=12233
DOCKER_SUDO=""   # set to "sudo" if Docker was just installed on Linux

# ── Colors ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { printf "${CYAN}[info]${NC} %s\n" "$*"; }
success() { printf "${GREEN}[ok]${NC}   %s\n" "$*"; }
warn()    { printf "${YELLOW}[warn]${NC} %s\n" "$*"; }
error()   { printf "${RED}[err]${NC}  %s\n" "$*" >&2; exit 1; }

# Run docker with optional sudo prefix
docker_cmd() { ${DOCKER_SUDO:-} docker "$@"; }

# ── OS detection ──────────────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Linux*)  OS=linux ;;
    Darwin*) OS=mac ;;
    *)       error "Unsupported OS: $(uname -s). On Windows use install.ps1 instead." ;;
  esac
}

# ── Install git ───────────────────────────────────────────────────────────
install_git() {
  if command -v git >/dev/null 2>&1; then
    success "git $(git --version | awk '{print $3}') already installed"
    return
  fi
  warn "git not found — installing..."
  if [ "$OS" = "mac" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install git
    else
      # Trigger Xcode CLT installer (user must complete it then re-run)
      xcode-select --install 2>/dev/null || true
      info "Please complete the Xcode Command Line Tools install, then re-run this script."
      exit 0
    fi
  elif [ "$OS" = "linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update -qq && sudo apt-get install -y git
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y git
    elif command -v yum >/dev/null 2>&1; then
      sudo yum install -y git
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm git
    elif command -v apk >/dev/null 2>&1; then
      sudo apk add --no-cache git
    else
      error "Cannot install git automatically. Please install git manually and re-run."
    fi
  fi
  success "git installed"
}

# ── Install Docker ────────────────────────────────────────────────────────
install_docker() {
  if command -v docker >/dev/null 2>&1; then
    success "Docker $(docker --version | awk '{print $3}' | tr -d ',') already installed"
    return
  fi
  warn "Docker not found — installing..."
  if [ "$OS" = "mac" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install --cask docker
    else
      error "Please install Docker Desktop from https://www.docker.com/products/docker-desktop and re-run."
    fi
    info "Please open Docker Desktop from Applications, wait for it to start, then re-run this script."
    exit 0
  elif [ "$OS" = "linux" ]; then
    # Official Docker convenience script
    curl -fsSL https://get.docker.com | sh
    # Start the Docker service
    sudo systemctl enable --now docker 2>/dev/null \
      || sudo service docker start 2>/dev/null \
      || true
    # Add current user to docker group to avoid needing sudo permanently
    if getent group docker >/dev/null 2>&1; then
      sudo usermod -aG docker "$USER" 2>/dev/null || true
      warn "Added $USER to docker group."
      warn "You'll need to log out and back in for this to take effect permanently."
      warn "For this session, docker commands will run with sudo..."
      DOCKER_SUDO="sudo"
    fi
    success "Docker installed"
  fi
}

# ── Wait for Docker daemon to be ready ───────────────────────────────────
wait_for_docker() {
  info "Waiting for Docker daemon to be ready..."
  i=0
  while ! docker_cmd info >/dev/null 2>&1; do
    i=$((i + 1))
    if [ $i -ge 15 ]; then
      error "Docker daemon did not start in time. Please start Docker and re-run."
    fi
    sleep 2
  done
  success "Docker daemon is ready"
}

# ── Check docker compose ──────────────────────────────────────────────────
check_compose() {
  if docker_cmd compose version >/dev/null 2>&1; then
    # Build the compose command string (with optional sudo prefix)
    COMPOSE="${DOCKER_SUDO:+sudo }docker compose"
    success "docker compose (v2) available"
  elif ${DOCKER_SUDO:-} docker-compose version >/dev/null 2>&1; then
    COMPOSE="${DOCKER_SUDO:+sudo }docker-compose"
    success "docker-compose (v1) available"
  else
    error "docker compose not found. Please update Docker to a recent version."
  fi
}

# ── Clone or update repo ──────────────────────────────────────────────────
setup_repo() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repo already exists at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only \
      || warn "Could not fast-forward pull (local modifications?). Continuing with current version."
  else
    info "Cloning GetThatQuick into $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
  success "Repo ready at $INSTALL_DIR"
}

# ── Start the app ─────────────────────────────────────────────────────────
start_app() {
  info "Pulling and starting GetThatQuick from GHCR..."
  cd "$INSTALL_DIR"
  $COMPOSE pull
  $COMPOSE up -d
  success "GetThatQuick is running!"
}

# ── Main ──────────────────────────────────────────────────────────────────
printf "\n${BOLD}${CYAN}GetThatQuick Installer${NC}\n"
printf "──────────────────────────────────────\n\n"

detect_os
info "Detected OS: $OS"

install_git
install_docker
wait_for_docker
check_compose
setup_repo
start_app

printf "\n${GREEN}${BOLD}All done!${NC}\n"
printf "  App:  ${CYAN}http://localhost:${PORT}${NC}\n"
printf "  Data: ${CYAN}~/getthatquick${NC}\n\n"
printf "To stop:   cd %s && %s down\n" "$INSTALL_DIR" "$COMPOSE"
printf "To update: cd %s && git pull && %s pull && %s up -d\n\n" "$INSTALL_DIR" "$COMPOSE" "$COMPOSE"
