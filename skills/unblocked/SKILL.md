---
name: unblocked
description: Install, set up, troubleshoot and extend Unblocked (a desktop planner that turns notes into tasks and calendar events with an AI). Use when asked to install or remove it, connect it to Gemini or OpenRouter, figure out why "Sort it out" fails, back up or reset its data, or add a feature to the app.
---

# unblocked

A Tauri + Rust desktop app. One binary, `unblocked`, one SQLite file, keys in the system keyring.

## Start here, every time

1. Run `scripts/probe.sh` (read-only). It prints `key=value` facts: OS, toolchain, keyring, API key env vars, install state, data and log paths. Base every decision on these facts.
2. Pick the playbook that matches the request:

| The user wants to | Playbook |
| --- | --- |
| install, update or remove it | [playbooks/install.md](playbooks/install.md) |
| connect an AI provider, change the model, use reference files | [playbooks/setup-ai.md](playbooks/setup-ai.md) |
| fix a blank window, failing "Sort it out", lost keys | [playbooks/troubleshoot.md](playbooks/troubleshoot.md) |
| add a page or feature | [playbooks/extend.md](playbooks/extend.md) |

3. Finish with the report described below.

## Rules

- Ask before anything that needs `sudo`.
- Never print, log or commit an API key. Ask the user to paste it into Settings themselves, or to export it in their own shell profile.
- Back up the database before touching it: `cp unblocked.db unblocked.db.bak.$(date +%s)` with the app closed.
- Never claim a step worked without checking it. Every playbook ends with a check: run it.

## Useful paths

```bash
~/.local/share/unblocked/unblocked.db             # all data (UNBLOCKED_DB overrides)
~/.local/state/unblocked/logs/unblocked.log       # log (UNBLOCKED_LOG=debug for more)
tail -n 50 ~/.local/state/unblocked/logs/unblocked.log
```

## Report back

End with a short summary the user can scan:

- what you installed or changed (files, with paths)
- whether "Test connection" in Settings passes
- anything the user must do themselves (paste a key, enter a password)
