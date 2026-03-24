# Troubleshoot

Read the log first: `tail -n 100 ~/.local/state/unblocked/logs/unblocked.log` (`UNBLOCKED_LOG=debug unblocked` for more).

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Window opens blank or white | WebKitGTK GPU path on this driver | start with `WEBKIT_DISABLE_COMPOSITING_MODE=1 unblocked`; if that helps, add it to the launcher's `Exec=` via `env` |
| "Sort it out" says to open Settings | no key, or the provider rejected it (401/403) | [setup-ai.md](setup-ai.md); **Test connection** shows the provider's message |
| "The AI answered, but not in the expected shape" | the model does not support JSON schema output well | pick another model (the defaults work) |
| Key is gone after a reboot | no Secret Service running, keyring locked | start or unlock the keyring, or use the env var |
| Data looks wrong after an update | — | close the app, back up the DB, include the log in the bug report |

If a page shows an error card, the stack trace is in the log.
