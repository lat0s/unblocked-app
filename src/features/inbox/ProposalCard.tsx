import { format, parseISO } from "date-fns";
import { Brain, CalendarDays, Check, ChevronDown, Clock, Flag, ListChecks, Pencil, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

import { KIND_LABEL } from "@/features/calendar/api";
import { bookName, principleName } from "@/shared/books";
import { due, minutes, pct } from "@/shared/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

import { reviewReason, useAccept, useDismiss, useUpdateItem, type Item, type Kind } from "./api";

export function ProposalCard({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const p = item.proposal;
  const [why, setWhy] = useState(false);
  const accept = useAccept();
  const dismiss = useDismiss();
  const update = useUpdateItem();
  const warn = reviewReason(p);
  const busy = accept.isPending || dismiss.isPending;
  const isEvent = p.kind === "event";
  const date = p.date ?? p.dueDate;

  const flip = (kind: Kind) =>
    kind !== p.kind && update.mutate({ id: item.id, proposal: { ...p, kind, eventKind: p.eventKind ?? "meeting" } });

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-edge bg-card shadow-brutal-sm transition-opacity",
        busy && "opacity-50",
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", isEvent ? "bg-deep" : "bg-task")} />
      <div className="py-3.5 pr-4 pl-6">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border-2 border-edge text-xs font-semibold">
            {(["task", "event"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => flip(k)}
                className={cn(
                  "px-2 py-0.5 capitalize first:rounded-l-[4px] last:rounded-r-[4px]",
                  p.kind === k ? (k === "event" ? "bg-deep text-white" : "bg-task text-white") : "text-muted-foreground hover:bg-muted",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          {warn ? (
            <Badge tone="warn">
              <TriangleAlert /> {warn}
            </Badge>
          ) : (
            p.confidence != null && <span className="num text-xs text-muted-foreground">{pct(p.confidence)} sure</span>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            title="Dismiss"
            disabled={busy}
            onClick={() => dismiss.mutate(item.id)}
          >
            <X />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Edit" title="Edit" disabled={busy} onClick={onEdit}>
            <Pencil />
          </Button>
          <Button size="sm" className="border-2 border-edge shadow-brutal-sm" disabled={busy} onClick={() => accept.mutate(item.id)}>
            <Check /> {isEvent ? "To calendar" : "To board"}
          </Button>
        </div>

        <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-snug font-semibold">
          {!isEvent && (p.priority === "urgent" || p.priority === "high") && (
            <Flag className={cn("mt-1 size-3.5 shrink-0", p.priority === "urgent" ? "fill-event text-event" : "text-event")} />
          )}
          {p.title}
        </p>
        {!isEvent && p.nextAction && <p className="mt-1 text-sm text-muted-foreground">→ {p.nextAction}</p>}
        {p.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.notes}</p>}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {isEvent ? (
            <>
              {date && (
                <Badge tone="deep">
                  <CalendarDays /> {format(parseISO(date), "EEE d MMM")}
                </Badge>
              )}
              <Badge>
                <Clock /> {p.startTime ? `${p.startTime}${p.endTime ? `–${p.endTime}` : ""}` : "All day"}
              </Badge>
              {p.eventKind && <Badge>{KIND_LABEL[p.eventKind]}</Badge>}
            </>
          ) : (
            <>
              {date && (
                <Badge tone={due(date)?.tone}>
                  <CalendarDays /> {due(date)?.label}
                </Badge>
              )}
              {!!p.estimateMin && (
                <Badge>
                  <Clock /> {minutes(p.estimateMin)}
                </Badge>
              )}
              {p.context && <Badge>{p.context}</Badge>}
              {p.subtasks.length > 0 && (
                <Badge>
                  <ListChecks /> {p.subtasks.length} steps
                </Badge>
              )}
            </>
          )}
          {(p.deepWork || p.workType === "deep") && (
            <Badge tone="deep">
              <Brain /> Deep work
            </Badge>
          )}
          {p.strategies.length > 0 && (
            <button
              onClick={() => setWhy((w) => !w)}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Why this? <ChevronDown className={cn("size-3.5 transition-transform", why && "rotate-180")} />
            </button>
          )}
        </div>

        {why && (
          <ul className="mt-3 grid gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/60 p-3">
            {p.strategies.map((s, i) => (
              <li key={i} className="text-xs leading-relaxed">
                <span className="font-semibold">{bookName(s.book)}</span>
                <span className="text-muted-foreground"> · {principleName(s.principle)}</span>
                <p className="text-muted-foreground">{s.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
