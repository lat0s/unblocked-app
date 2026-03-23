import { ArrowRight, Check, Inbox, Loader2, Settings, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useNav } from "@/app/nav";
import { toAppError } from "@/shared/ipc";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils";

import { KIND_HINT, missing, refLabel, useFinish, useStart, type Answers, type Draft, type Outcome, type Question } from "./api";

type Props = { noteId: string | null; onClose: () => void; onDone: () => void };

/** Note → (questions, if the AI needs them) → inbox. */
export function RefineWizard({ noteId, onClose, onDone }: Props) {
  return (
    <Dialog open={!!noteId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-2 border-edge shadow-brutal-lg sm:max-w-xl">
        {noteId && <Flow key={noteId} noteId={noteId} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

function Flow({ noteId, onClose, onDone }: { noteId: string; onClose: () => void; onDone: () => void }) {
  const start = useStart();
  const finish = useFinish();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [cards, setCards] = useState<string[]>([]);
  const began = useRef(false);

  const plan = (a: Answers, c: string[]) =>
    finish.mutate(
      { noteId, answers: a, cards: c },
      {
        onSuccess: (o) => {
          setOutcome(o);
          onDone();
        },
      },
    );

  const read = () =>
    start.mutate(noteId, {
      onSuccess: (d) => {
        setDraft(d);
        if (!d.wizard) plan({}, []);
      },
    });

  useEffect(() => {
    if (began.current) return;
    began.current = true;
    read();
  });

  const error = start.error ?? finish.error;
  if (error) return <Failed error={error} onRetry={() => (draft ? plan(answers, cards) : read())} onClose={onClose} />;
  if (outcome) return <Done outcome={outcome} onClose={onClose} />;
  if (start.isPending || !draft) return <Busy title="Reading your note" sub="Finding the tasks, the appointments and the unclear bits." />;
  if (finish.isPending || !draft.wizard) return <Busy title="Planning it out" sub="Writing tasks, first steps and time estimates." />;

  const open = missing(draft.questions, answers);
  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-heading text-xl">
          <Sparkles className="size-5 text-primary" /> A few quick questions
        </DialogTitle>
        <DialogDescription>
          {draft.items.length} thing{draft.items.length === 1 ? "" : "s"} found. Answer what you can; anything you skip, I&apos;ll make my
          best guess.
        </DialogDescription>
      </DialogHeader>

      {draft.questions.map((q, i) => (
        <QuestionField key={q.id} n={i + 1} q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
      ))}

      {draft.cards.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Want me to also…</p>
          {draft.cards.map((c) => {
            const on = cards.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setCards((x) => (on ? x.filter((id) => id !== c.id) : [...x, c.id]))}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
                  on ? "border-edge bg-secondary shadow-brutal-sm" : "border-border hover:border-edge",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded border-2 border-edge",
                    on && "bg-primary text-primary-foreground",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {c.title}
                    {c.count ? <span className="num font-normal text-muted-foreground"> · {c.count}</span> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{c.rationale}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky -bottom-4 -mx-4 -mb-4 flex items-center gap-2 border-t-2 border-dashed border-border bg-popover px-4 pt-4 pb-4">
        <Button variant="ghost" onClick={() => plan({}, cards)}>
          Skip, just guess
        </Button>
        <div className="flex-1" />
        {open.length > 0 && <span className="text-xs text-muted-foreground">{open.length} required left</span>}
        <Button size="lg" className="border-2 border-edge shadow-brutal-sm" disabled={open.length > 0} onClick={() => plan(answers, cards)}>
          Plan it <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function QuestionField({ n, q, value, onChange }: { n: number; q: Question; value: string; onChange: (v: string) => void }) {
  const type = q.kind === "due_date" ? "date" : q.kind === "due_time" ? "time" : "text";
  return (
    <div className="grid gap-2 rounded-xl border-2 border-edge bg-card p-4 shadow-brutal-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="num grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{n}</span>
        <span className="tracking-wide uppercase">{KIND_HINT[q.kind]}</span>
        {q.required && <span className="text-event">required</span>}
      </div>
      {q.quotes.length > 0 && (
        <blockquote className="rounded-md border-l-4 border-primary bg-secondary/70 px-3 py-1.5 text-sm">
          {q.quotes.map((t, i) => (
            <p key={i}>
              <span className="num mr-2 text-xs text-muted-foreground">{refLabel(q.refs[i] ?? "")}</span>
              {t}
            </p>
          ))}
        </blockquote>
      )}
      <p className="font-semibold">{q.label}</p>
      {q.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {q.options.map((o) => (
            <button
              key={o.value}
              onClick={() => onChange(value === o.value ? "" : o.value)}
              className={cn(
                "rounded-full border-2 px-3 py-1 text-sm font-medium transition-colors",
                value === o.value ? "border-edge bg-primary text-primary-foreground" : "border-border hover:border-edge",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <Input
        type={type}
        placeholder={q.placeholder ?? "Or type your own answer"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Busy({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="grid place-items-center gap-3 py-10 text-center">
      <div className="relative">
        <img src="/blob.png" alt="" className="size-20 animate-[bounce_1.6s_ease-in-out_infinite]" />
        <Loader2 className="absolute -right-2 -bottom-1 size-6 animate-spin text-primary" />
      </div>
      <DialogTitle className="font-heading text-xl">{title}…</DialogTitle>
      <p className="max-w-xs text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Done({ outcome, onClose }: { outcome: Outcome; onClose: () => void }) {
  const nav = useNav();
  const parts = [
    outcome.tasks && `${outcome.tasks} task${outcome.tasks === 1 ? "" : "s"}`,
    outcome.events && `${outcome.events} event${outcome.events === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return (
    <div className="grid gap-4">
      <div className="grid place-items-center gap-2 pt-4 text-center">
        <img src="/blob.png" alt="" className="size-16" />
        <DialogTitle className="font-heading text-2xl">{outcome.count ? "Sorted." : "Nothing to plan"}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {outcome.count
            ? `${parts.join(" and ")} waiting in your inbox for a yes or no.`
            : "I couldn't find anything actionable in this note."}
        </p>
      </div>
      {outcome.insights.length > 0 && (
        <ul className="grid gap-1.5 rounded-lg border-2 border-dashed border-border bg-secondary/60 p-3 text-sm">
          {outcome.insights.map((s, i) => (
            <li key={i} className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /> {s}
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {outcome.count > 0 && (
          <Button
            className="border-2 border-edge shadow-brutal-sm"
            onClick={() => {
              onClose();
              nav("inbox");
            }}
          >
            <Inbox /> Review in inbox
          </Button>
        )}
      </div>
    </div>
  );
}

function Failed({ error, onRetry, onClose }: { error: unknown; onRetry: () => void; onClose: () => void }) {
  const nav = useNav();
  const e = toAppError(error);
  const setup = e.kind === "notConfigured";
  return (
    <div className="grid gap-4">
      <div className="grid place-items-center gap-2 pt-4 text-center">
        <TriangleAlert className="size-10 text-event" />
        <DialogTitle className="font-heading text-xl">{setup ? "Set up the AI first" : "That didn't work"}</DialogTitle>
        <p className="max-w-sm text-sm text-muted-foreground">{e.message}</p>
        <p className="text-xs text-muted-foreground">Your note is saved either way.</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {setup ? (
          <Button
            onClick={() => {
              onClose();
              nav("settings");
            }}
          >
            <Settings /> Open Settings
          </Button>
        ) : (
          <Button onClick={onRetry}>Try again</Button>
        )}
      </div>
    </div>
  );
}
