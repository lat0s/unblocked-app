#!/usr/bin/env bash
# Build Unblocked from source and install it for the current user.
# Safe to re-run: every step checks before it changes anything.
set -euo pipefail

PREFIX="${PREFIX:-$HOME/.local}"
DEPS=0 BUILD=1
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_NAME=unblocked

usage() {
  cat <<USAGE
Usage: scripts/install.sh [--deps] [--skip-build] [--prefix DIR]

  --deps        install build dependencies with your package manager (uses sudo)
  --skip-build  install the binary already in src-tauri/target/release
  --prefix DIR  install location (default: ~/.local)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deps) DEPS=1 ;;
    --skip-build) BUILD=0 ;;
    --prefix) PREFIX="$2"; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

step() { printf '\n\033[1;35m==>\033[0m %s\n' "$*"; }
ok() { printf '    %s\n' "$*"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

distro_family() {
  local id="" like=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    id="${ID:-}" like="${ID_LIKE:-}"
  fi
  case " $id $like " in
    *" arch "* | *" manjaro "* | *" endeavouros "*) echo arch ;;
    *" debian "* | *" ubuntu "*) echo debian ;;
    *" fedora "* | *" rhel "* | *" centos "*) echo fedora ;;
    *" suse "* | *" opensuse "*) echo suse ;;
    *) echo other ;;
  esac
}

install_deps() {
  local fam
  fam="$(distro_family)"
  step "Installing build dependencies ($fam)"
  case "$fam" in
    arch) sudo pacman -S --needed --noconfirm webkit2gtk-4.1 base-devel curl wget file openssl librsvg dbus ;;
    debian)
      sudo apt-get update
      sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev librsvg2-dev libdbus-1-dev pkg-config
      ;;
    fedora)
      sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file librsvg2-devel dbus-devel
      sudo dnf group install -y c-development 2>/dev/null || sudo dnf groupinstall -y "Development Tools"
      ;;
    suse)
      sudo zypper --non-interactive install webkit2gtk3-devel libopenssl-devel curl wget file librsvg-devel dbus-1-devel
      sudo zypper --non-interactive install -t pattern devel_basis
      ;;
    *) die "unknown distro: install the Tauri v2 Linux prerequisites by hand (https://v2.tauri.app/start/prerequisites/#linux) plus the dbus headers, then re-run without --deps" ;;
  esac
}

check_toolchain() {
  step "Checking toolchain"
  have cargo || die "Rust is missing. Install it with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  have node || die "Node.js 20+ is missing (use your package manager, nvm, fnm or mise)"
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [[ "$major" -ge 20 ]] || die "Node.js 20+ required, found $(node -v)"
  if ! have pnpm; then
    have corepack || die "pnpm is missing: npm install -g pnpm"
    corepack enable pnpm >/dev/null 2>&1 || die "could not enable pnpm via corepack: npm install -g pnpm"
  fi
  pkg-config --exists webkit2gtk-4.1 2>/dev/null || die "webkit2gtk-4.1 development files not found. Re-run with --deps"
  pkg-config --exists dbus-1 2>/dev/null || die "dbus-1 development files not found. Re-run with --deps"
  ok "cargo $(cargo --version | cut -d' ' -f2), node $(node -v), pnpm $(pnpm -v)"
}

build() {
  step "Building (first build takes a few minutes)"
  cd "$ROOT"
  pnpm install --frozen-lockfile
  pnpm exec tauri build --no-bundle
}

install_files() {
  local bin="$ROOT/src-tauri/target/release/$BIN_NAME"
  [[ -x "$bin" ]] || die "no binary at $bin (build first or drop --skip-build)"
  step "Installing into $PREFIX"
  install -Dm755 "$bin" "$PREFIX/bin/$BIN_NAME"
  local -A icons=([32]=32x32.png [64]=64x64.png [128]=128x128.png [256]=128x128@2x.png [512]=icon.png)
  for size in "${!icons[@]}"; do
    install -Dm644 "$ROOT/src-tauri/icons/${icons[$size]}" "$PREFIX/share/icons/hicolor/${size}x${size}/apps/$BIN_NAME.png"
  done
  install -Dm644 "$ROOT/assets/icon.svg" "$PREFIX/share/icons/hicolor/scalable/apps/$BIN_NAME.svg"
  mkdir -p "$PREFIX/share/applications"
  sed "s|@EXEC@|$PREFIX/bin/$BIN_NAME|" "$ROOT/packaging/$BIN_NAME.desktop.in" >"$PREFIX/share/applications/$BIN_NAME.desktop"
  have update-desktop-database && update-desktop-database "$PREFIX/share/applications" >/dev/null 2>&1 || true
  have gtk-update-icon-cache && gtk-update-icon-cache -q -t "$PREFIX/share/icons/hicolor" >/dev/null 2>&1 || true
  ok "binary   $PREFIX/bin/$BIN_NAME"
  ok "launcher $PREFIX/share/applications/$BIN_NAME.desktop"
  case ":$PATH:" in *":$PREFIX/bin:"*) ;; *) ok "note: $PREFIX/bin is not on PATH" ;; esac
}

[[ "$(uname -s)" == Linux ]] || die "Linux only (on macOS or Windows run: pnpm install && pnpm package)"
[[ $DEPS == 1 ]] && install_deps
if [[ $BUILD == 1 ]]; then
  check_toolchain
  build
fi
install_files
printf '\nDone. Open "Unblocked" from your app launcher or run %s.\n' "$BIN_NAME"
printf 'Add an API key in Settings (Gemini or OpenRouter) to turn notes into plans.\n'
