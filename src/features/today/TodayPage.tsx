import { format } from "date-fns";
import { ArrowRight, Brain, CalendarDays, Check, Inbox, Play, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useNav } from "@/app/nav";
import { useMoveTask, useTasks, WIP_LIMIT, type Task } from "@/features/board/api";
import { useEvents } from "@/features/calendar/api";
import { newNoteId, saveNote } from "@/features/capture/api";
import { useInbox } from "@/features/inbox/api";
import { RefineWizard } from "@/features/refine/RefineWizard";
import { due, isoDate, minutes } from "@/shared/format";
import { errText } from "@/shared/ipc";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { cn } from "@/shared/utils";

import { doneThisWeek, greeting, nextUp } from "./plan";

export function TodayPage() {
  const [now] = useState(() => new Date());
  const today = isoDate(now);
  const { data: tasks = [] } = useTasks();
  const { data: events = [] } = useEvents(today, today);
  const { data: inbox = [] } = useInbox();
  const nav = useNav();
  const up = nextUp(tasks, now);
  const doing = tasks.filter((t) => t.status === "doing").length;

  return (
    <div className="flex-1 overflow-y-auto px-8 pt-7 pb-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{format(now, "EEEE d MMMM")}</p>
          <h1 className="font-heading text-[32px] leading-tight tracking-tight">{greeting(now)}.</h1>
        </div>
        <div className="flex gap-3">
          <Stat label="done this week" value={doneThisWeek(tasks, now)} tone="text-done" />
          <Stat label={`in progress / ${WIP_LIMIT}`} value={doing} tone={doing > WIP_LIMIT ? "text-event" : "text-foreground"} />
          <Stat label="in inbox" value={inbox.length} tone={inbox.length ? "text-primary" : "text-foreground"} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid content-start gap-6">
          <QuickDump />
          {inbox.length > 0 && (
            <button
              onClick={() => nav("inbox")}
              className="flex items-center gap-3 rounded-xl border-2 border-edge bg-primary p-4 text-left text-primary-foreground shadow-brutal transition-transform hover:-translate-y-px"
            >
              <Inbox className="size-5 shrink-0" />
              <span className="flex-1 font-semibold">
                {inbox.length} suggestion{inbox.length === 1 ? "" : "s"} waiting for a yes or no
              </span>
              <ArrowRight className="size-5" />
            </button>
          )}
          <Panel title="Next up" action={<LinkButton onClick={() => nav("board")}>Board</LinkButton>}>
            {up.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing on the board. Dump a note above to get going.</p>
            ) : (
              <ul className="grid gap-2">
                {up.map((t) => (
                  <NextTask key={t.id} task={t} now={now} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Today's schedule" className="self-start" action={<LinkButton onClick={() => nav("calendar")}>Calendar</LinkButton>}>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No events today. Good day for deep work.</p>
          ) : (
            <ol className="relative grid gap-3 border-l-2 border-dashed border-border pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={cn(
                      "absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-edge",
                      e.deepWork ? "bg-deep" : "bg-event",
                    )}
                  />
                  <p className="num text-xs font-semibold text-muted-foreground">
                    {e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ""}` : "All day"}
                  </p>
                  <p className="flex items-center gap-1.5 font-semibold">
                    {e.deepWork && <Brain className="size-4 text-deep" />}
                    {e.title}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-24 rounded-xl border-2 border-edge bg-card px-4 py-2.5 shadow-brutal-sm">
      <p className={cn("num font-heading text-2xl leading-none", tone)}>{value}</p>
      <p className="mt-1 text-xs whitespace-nowrap text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border-2 border-edge bg-card shadow-brutal", className)}>
      <div className="flex items-center justify-between border-b-2 border-edge px-5 py-3">
        <h2 className="font-heading text-sm tracking-wide uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
      {children} <ArrowRight className="size-3.5" />
    </button>
  );
}

function NextTask({ task, now }: { task: Task; now: Date }) {
  const move = useMoveTask();
  const d = due(task.dueDate, now);
  const doing = task.status === "doing";
  return (
    <li className={cn("flex items-start gap-3 rounded-lg border-2 p-3", doing ? "border-edge bg-doing/15" : "border-border")}>
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-semibold">{task.title}</p>
        {task.nextAction && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">→ {task.nextAction}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
          {doing && <Badge tone="warn">Doing</Badge>}
          {d && (
            <Badge tone={d.tone}>
              <CalendarDays /> {d.label}
            </Badge>
          )}
          {!!task.estimateMin && <Badge>{minutes(task.estimateMin)}</Badge>}
        </div>
      </div>
      {doing ? (
        <Button size="sm" variant="outline" onClick={() => move.mutate({ id: task.id, status: "done", index: 0 })}>
          <Check /> Done
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => move.mutate({ id: task.id, status: "doing", index: 999 })}>
          <Play /> Start
        </Button>
      )}
    </li>
  );
}

/** A small capture box: saves a note and runs the wizard straight away. */
function QuickDump() {
  const [text, setText] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      const n = await saveNote(newNoteId(), text);
      if (n) setNoteId(n.id);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border-2 border-edge bg-card p-4 shadow-brutal">
      <Textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) void go();
        }}
        placeholder="What's on your mind? One thing per line."
        className="border-0 px-1 text-base focus-visible:border-0"
      />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Ctrl + Enter</span>
        <div className="flex-1" />
        <Button className="border-2 border-edge shadow-brutal-sm" disabled={!text.trim() || busy} onClick={() => void go()}>
          <Sparkles /> Sort it out
        </Button>
      </div>
      <RefineWizard noteId={noteId} onClose={() => setNoteId(null)} onDone={() => setText("")} />
    </section>
  );
}
