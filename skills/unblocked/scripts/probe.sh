#!/usr/bin/env bash
# Prints facts about this machine as key=value lines. Read-only; safe to run any time.
has() { command -v "$1" >/dev/null 2>&1 && echo yes || echo no; }
ver() { command -v "$1" >/dev/null 2>&1 && "$1" --version 2>/dev/null | head -1 | tr -d '\n' || echo missing; }

. /etc/os-release 2>/dev/null
echo "os=$(uname -s)"
echo "distro=${ID:-unknown}"
echo "distro_like=${ID_LIKE:-}"
echo "desktop=${XDG_CURRENT_DESKTOP:-unknown}"
echo "session=${XDG_SESSION_TYPE:-unknown}"
echo "rust=$(ver cargo)"
echo "node=$(ver node)"
echo "pnpm=$(ver pnpm)"
echo "webkit_dev=$(pkg-config --exists webkit2gtk-4.1 2>/dev/null && echo yes || echo no)"
echo "dbus_dev=$(pkg-config --exists dbus-1 2>/dev/null && echo yes || echo no)"
echo "secret_service=$(busctl --user status org.freedesktop.secrets >/dev/null 2>&1 && echo yes || echo no)"
echo "gemini_env=$([ -n "${GEMINI_API_KEY:-}" ] && echo set || echo unset)"
echo "openrouter_env=$([ -n "${OPENROUTER_API_KEY:-}" ] && echo set || echo unset)"
echo "installed=$(command -v unblocked || echo no)"
db="${UNBLOCKED_DB:-${XDG_DATA_HOME:-$HOME/.local/share}/unblocked/unblocked.db}"
echo "db=$([ -f "$db" ] && echo "$db" || echo none)"
echo "log=${XDG_STATE_HOME:-$HOME/.local/state}/unblocked/logs/unblocked.log"
