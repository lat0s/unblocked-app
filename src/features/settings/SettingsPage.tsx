import { Library, Check, KeyRound, Loader2, Plug, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input, Label } from "@/shared/ui/input";
import { cn } from "@/shared/utils";

import {
  PROVIDERS,
  useAiStatus,
  useAppInfo,
  useClearKey,
  useModels,
  useSaveAi,
  useSetKey,
  useTestAi,
  type AiStatus,
  type Provider,
} from "./api";

export function SettingsPage() {
  const status = useAiStatus();
  return (
    <>
      <PageHeader title="Settings" sub="Everything stays on this computer. Only the note you process is sent to the AI provider." />
      <div className="flex-1 overflow-y-auto px-8 pb-10">
        <div className="mx-auto grid max-w-2xl gap-6">
          {status.data && <AiCard key={status.data.settings.provider} status={status.data} />}
          {status.data && <GroundingCard status={status.data} />}
          <AboutCard />
        </div>
      </div>
    </>
  );
}

function Card({ icon, title, sub, children }: { icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border-2 border-edge bg-card p-6 shadow-brutal">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-edge bg-secondary">{icon}</div>
        <div>
          <h2 className="font-heading text-lg leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function AiCard({ status }: { status: AiStatus }) {
  const { settings, keySource } = status;
  const p = PROVIDERS[settings.provider];
  const [key, setKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const save = useSaveAi();
  const setK = useSetKey();
  const clearK = useClearKey();
  const test = useTestAi();
  const models = useModels(settings.provider);

  const switchTo = (provider: Provider) => save.mutate({ ...settings, provider, model: PROVIDERS[provider].model });

  return (
    <Card icon={<Sparkles className="size-4" />} title="AI provider" sub="Turns your notes into tasks and events. Bring your own key.">
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-1 rounded-lg border-2 border-edge bg-muted p-1">
          {(Object.keys(PROVIDERS) as Provider[]).map((id) => (
            <button
              key={id}
              onClick={() => id !== settings.provider && switchTo(id)}
              className={cn(
                "h-9 rounded-md text-sm font-semibold transition-colors",
                id === settings.provider ? "bg-card shadow-brutal-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PROVIDERS[id].label}
            </button>
          ))}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="key">API key</Label>
            <KeyState source={keySource} env={p.env} />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setK.mutate({ provider: settings.provider, key }, { onSuccess: () => setKey("") });
            }}
          >
            <Input
              id="key"
              type="password"
              autoComplete="off"
              placeholder={keySource === "none" ? `Paste your ${p.label} key` : "Paste a new key to replace it"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <Button type="submit" disabled={!key.trim() || setK.isPending}>
              <KeyRound /> Save
            </Button>
            {keySource === "keyring" && (
              <Button type="button" variant="outline" onClick={() => clearK.mutate(settings.provider)}>
                Remove
              </Button>
            )}
          </form>
          <p className="text-xs text-muted-foreground">
            Get one at <span className="num text-foreground select-all">{p.keyUrl.replace("https://", "")}</span>
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="model">Model</Label>
          <div className="flex gap-2">
            <Input id="model" list="models" value={model} onChange={(e) => setModel(e.target.value)} className="num" />
            <datalist id="models">
              {models.data?.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <Button
              variant="outline"
              disabled={keySource === "none" || models.isFetching}
              onClick={() => void models.refetch().then((r) => r.error && toast.error(String(r.error.message)))}
            >
              {models.isFetching ? <Loader2 className="animate-spin" /> : null}
              {models.data ? `${models.data.length} models` : "Load list"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Needs JSON (structured output) support. Fast, cheap models work well.</p>
        </div>

        <div className="flex items-center gap-2 border-t-2 border-dashed border-border pt-4">
          <Button disabled={model.trim() === settings.model || save.isPending} onClick={() => save.mutate({ ...settings, model })}>
            Save model
          </Button>
          <Button
            variant="outline"
            disabled={keySource === "none" || test.isPending}
            onClick={() => test.mutate(undefined, { onSuccess: (msg) => toast.success("Connection works", { description: msg }) })}
          >
            {test.isPending ? <Loader2 className="animate-spin" /> : <Plug />} Test connection
          </Button>
        </div>
      </div>
    </Card>
  );
}

function KeyState({ source, env }: { source: AiStatus["keySource"]; env: string }) {
  if (source === "keyring")
    return (
      <Badge tone="done">
        <Check /> In system keyring
      </Badge>
    );
  if (source === "env") return <Badge tone="deep">From ${env}</Badge>;
  return <Badge tone="warn">Not set</Badge>;
}

function GroundingCard({ status }: { status: AiStatus }) {
  const { settings } = status;
  const [store, setStore] = useState(settings.store ?? "");
  const save = useSaveAi();
  const gemini = settings.provider === "gemini";
  return (
    <Card
      icon={<Library className="size-4" />}
      title="Reference library"
      sub="Optional. Lets Gemini look things up in your own reference files when it explains a suggestion."
    >
      <div className="grid gap-1.5">
        <Label htmlFor="store">Gemini File Search store</Label>
        <div className="flex gap-2">
          <Input
            id="store"
            className="num"
            placeholder="fileSearchStores/…"
            disabled={!gemini}
            value={store}
            onChange={(e) => setStore(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={!gemini || store.trim() === (settings.store ?? "") || save.isPending}
            onClick={() =>
              save.mutate({ ...settings, store }, { onSuccess: () => toast.success(store.trim() ? "Grounding on" : "Grounding off") })
            }
          >
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {gemini
            ? "Leave empty to use the built-in method notes only."
            : "Only available with Gemini. OpenRouter uses the built-in method notes."}
        </p>
      </div>
    </Card>
  );
}

function AboutCard() {
  const info = useAppInfo().data;
  const row = (label: string, value?: string) => (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="num truncate select-all" title={value}>
        {value ?? "…"}
      </span>
    </div>
  );
  return (
    <Card icon={<img src="/blob.png" alt="" className="size-6" />} title="About" sub="Unblocked: brain dump in, plan out.">
      {row("Version", info?.version)}
      {row("Database", info?.dbPath)}
      {row("Log file", info?.logFile)}
      <p className="mt-3 text-xs text-muted-foreground">Built for the TIA410 course project, developed solo. MIT licensed.</p>
    </Card>
  );
}
