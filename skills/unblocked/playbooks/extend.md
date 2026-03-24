# Add a feature

Features are vertical slices. Copy the shape of a small one (`capture`) rather than inventing a new one.

## Backend: `src-tauri/src/<feature>/`

1. `schema.sql`: the slice's tables, exposed as `pub const SCHEMA: &str = include_str!("schema.sql")`. Add `("<feature>", <feature>::SCHEMA)` to `migrations()` in `lib.rs`.
2. `mod.rs`: plain functions over `&Connection`, returning `AppResult<T>`. Unit-test them on `Db::in_memory(&[("<feature>", SCHEMA)])`.
3. `commands.rs`: one `#[tauri::command]` per action, each a `core::blocking` call. Register them in `generate_handler!` in `lib.rs`.
4. Use other slices only through their public functions.

## Frontend: `src/features/<feature>/`

1. `api.ts`: types matching the Rust structs (camelCase), `useQuery` / `useAction` hooks over `call()`. Invalidate the query keys your change affects.
2. Pure helpers next to it, with a `*.test.ts`.
3. The page component, using `PageHeader`, `Empty` and the `shared/ui` parts.
4. Register the page in `src/app/pages.tsx` and its id in `src/app/nav.ts`.

## Check

`pnpm run check && pnpm test`, then `pnpm dev` and click through the new page.
