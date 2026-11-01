/** True inside the desktop app; false in the browser demo. */
export const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const REPO_URL = "https://github.com/lat0s/unblocked-app";

export const DEMO_AI_MESSAGE =
  "The live demo has no AI key. For security, clone the repo, build the app and use your own Gemini or OpenRouter key.";
