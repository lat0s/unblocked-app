# Working on Unblocked

Installing, configuring or troubleshooting the app on a machine: follow [skills/unblocked/SKILL.md](skills/unblocked/SKILL.md).

Changing the code:

- Layout is by feature (vertical slices). Backend `src-tauri/src/<feature>/{mod.rs, commands.rs, schema.sql}`, frontend `src/features/<feature>/`. Shared code lives in `src-tauri/src/core` and `src/shared`; nothing there imports a feature.
- A new slice registers its migration in `lib.rs migrations()`, its commands in `generate_handler!` and its page in `src/app/pages.tsx`. See [skills/unblocked/playbooks/extend.md](skills/unblocked/playbooks/extend.md).
- Commands return `AppResult<T>` and run through `core::blocking`. Use `AppError::NotConfigured` for "set this up first", never a panic.
- Never hold the database lock during a network call.
- LLM schemas: every property required, nullable when it can be empty (`refine/schema.rs` `obj()`). Validate replies in code, do not trust them.
- Reference files for the AI (PDFs, EPUBs, `books/`) stay local and are git-ignored. Never commit them.
- Comments: one short line that says why, not what.
- Before committing: `pnpm run check && pnpm test`.
