import { invoke } from "@tauri-apps/api/core";

import { log } from "./log";

export type ErrorKind = "notConfigured" | "notFound" | "invalidInput" | "provider" | "failed";

/** Backend errors arrive as `{ kind, message }`; anything else becomes `failed`. */
export class AppError extends Error {
  readonly kind: ErrorKind;
  constructor(kind: ErrorKind, message: string) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
  }
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e && typeof e === "object" && "kind" in e && "message" in e) {
    return new AppError((e as { kind: ErrorKind }).kind, String((e as { message: unknown }).message));
  }
  return new AppError("failed", e instanceof Error ? e.message : String(e));
}

/** Typed `invoke` that normalizes and logs failures. Expected states (not configured, not found) are not logged. */
export async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (raw) {
    const e = toAppError(raw);
    if (e.kind === "failed" || e.kind === "provider") log("warn", `${cmd}: ${e.message}`);
    throw e;
  }
}

export const errText = (e: unknown) => toAppError(e).message;
