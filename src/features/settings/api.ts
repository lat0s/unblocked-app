import { useQuery } from "@tanstack/react-query";

import { call } from "@/shared/ipc";
import { useAction } from "@/shared/query";

export type Provider = "gemini" | "openrouter";
export type KeySource = "keyring" | "env" | "none";
export type AiSettings = { provider: Provider; model: string; store: string | null };
export type AiStatus = { settings: AiSettings; keySource: KeySource };
export type AppInfo = { version: string; dbPath: string; logFile: string };

export const PROVIDERS: Record<Provider, { label: string; env: string; keyUrl: string; model: string }> = {
  gemini: { label: "Gemini", env: "GEMINI_API_KEY", keyUrl: "https://aistudio.google.com/apikey", model: "gemini-2.5-flash" },
  openrouter: { label: "OpenRouter", env: "OPENROUTER_API_KEY", keyUrl: "https://openrouter.ai/keys", model: "google/gemini-2.5-flash" },
};

export const useAiStatus = () => useQuery({ queryKey: ["ai"], queryFn: () => call<AiStatus>("ai_status") });
export const useAppInfo = () => useQuery({ queryKey: ["app-info"], queryFn: () => call<AppInfo>("app_info"), staleTime: Infinity });

/** Model list from the provider; only fetched when asked, it needs a working key. */
export const useModels = (provider: Provider) =>
  useQuery({ queryKey: ["models", provider], queryFn: () => call<string[]>("ai_models"), enabled: false, staleTime: 10 * 60_000 });

export const useSaveAi = () => useAction((settings: AiSettings) => call<AiStatus>("ai_save_settings", { settings }), ["ai", "models"]);
export const useSetKey = () =>
  useAction((a: { provider: Provider; key: string }) => call("ai_set_key", a), ["ai", "models"], {
    success: "Key saved to the system keyring",
  });
export const useClearKey = () =>
  useAction((provider: Provider) => call("ai_clear_key", { provider }), ["ai", "models"], { success: "Key removed" });
export const useTestAi = () => useAction(() => call<string>("ai_test"), []);
