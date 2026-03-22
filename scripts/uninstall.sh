#!/usr/bin/env bash
# Remove everything install.sh added. Your notes, tasks and logs stay unless --purge is given.
set -euo pipefail

PREFIX="${PREFIX:-$HOME/.local}"
BIN_NAME=unblocked
PURGE=0
[[ "${1:-}" == "--purge" ]] && PURGE=1

pkill -x "$BIN_NAME" 2>/dev/null || true
rm -f "$PREFIX/bin/$BIN_NAME" "$PREFIX/share/applications/$BIN_NAME.desktop"
rm -f "$PREFIX"/share/icons/hicolor/*/apps/"$BIN_NAME".{png,svg}

if [[ $PURGE == 1 ]]; then
  rm -rf "${XDG_DATA_HOME:-$HOME/.local/share}/unblocked" "${XDG_STATE_HOME:-$HOME/.local/state}/unblocked"
  echo "unblocked removed, data and logs purged (API keys in the system keyring stay; clear them in Settings first)"
else
  echo "unblocked removed (data and logs kept; use --purge to delete them)"
fi
