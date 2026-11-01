import { invoke } from "@tauri-apps/api/core";

import { IN_TAURI } from "./runtime";

type Level = "error" | "warn" | "info";

/** Sends a line to the backend log file. Never throws. */
export function log(level: Level, message: string) {
  const toConsole = () => console[level === "info" ? "log" : level](message);
  if (!IN_TAURI) return toConsole();
  invoke("log_client", { level, message }).catch(toConsole);
}

const describe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e));

/** Uncaught errors and unhandled promise rejections go to the log file. */
export function installGlobalHandlers() {
  window.addEventListener("error", (ev) => log("error", `uncaught ${describe(ev.error ?? ev.message)}`));
  window.addEventListener("unhandledrejection", (ev) => log("error", `unhandled rejection ${describe(ev.reason)}`));
}

export const describeError = describe;
