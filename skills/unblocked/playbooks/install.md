# Install, update, uninstall

## 1. Decide from the probe

| Probe says | Do |
| --- | --- |
| `installed=` a path | this is an update: `git pull` in the repo, then step 4 |
| `webkit_dev=no` or `dbus_dev=no` | system packages are missing: step 2 |
| `rust=missing`, `node=missing`, `pnpm=missing` | toolchain is missing: step 3 |
| `os=Darwin` or Windows | skip the script: install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), then `pnpm install && pnpm package` |

## 2. System packages (needs sudo: ask first)

`scripts/install.sh --deps` installs them for Arch, Debian/Ubuntu, Fedora and openSUSE. Elsewhere install the Tauri v2 Linux prerequisites plus the dbus development package by hand.

## 3. Toolchain (no sudo)

- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`, then `. "$HOME/.cargo/env"`.
- Node.js 20 or newer.
- pnpm: `corepack enable pnpm` (or `npm install -g pnpm`).

## 4. Build and install

```bash
git clone https://github.com/lat0s/unblocked-app && cd unblocked-app
scripts/install.sh
```

The first build takes 2–5 minutes. It installs into `~/.local` (binary, icons, launcher entry).

## 5. Check

- `command -v unblocked` prints a path.
- Launch it (`unblocked &`), wait 3 s: the Today page shows and `grep -c ERROR` on the log reports no new errors.
- Continue with [setup-ai.md](setup-ai.md).

## Uninstall

`scripts/uninstall.sh` removes the binary, launcher and icons. `--purge` also deletes the database and logs. Keys stay in the keyring: clear them in Settings first if the user wants them gone.
