# Set up the AI provider

The app works without AI (board, calendar, notes). "Sort it out" needs a provider.

## 1. Pick a provider

| | Gemini | OpenRouter |
| --- | --- | --- |
| Key | https://aistudio.google.com/apikey | https://openrouter.ai/keys |
| Default model | `gemini-2.5-flash` | `google/gemini-2.5-flash` |
| Reference files (File Search) | yes | no |

If the probe shows `gemini_env=set` or `openrouter_env=set`, the app already picks that key up; Settings shows "From $…".

## 2. Add the key

The user pastes it in **Settings → AI provider → API key → Save**. It goes to the system keyring (`secret_service=yes` on Linux). Do not handle the key yourself.

No keyring (`secret_service=no`): use the env var in the user's shell profile instead, or start a keyring daemon (gnome-keyring, KeePassXC with Secret Service on).

## 3. Model

Any model with structured (JSON schema) output. **Load list** shows what the key can use. Cheap, fast models work well; the prompts are small.

## 4. Reference files (optional, Gemini only)

Create a Gemini File Search store with the user's own files, then paste its name (`fileSearchStores/...`) in **Settings → Reference library**. The files stay in the user's Google account; nothing goes into this repo.

## 5. Check

**Test connection** in Settings says OK. Then write a two-line note on Capture and press **Sort it out**: questions or a plan appear within ~20 s.
