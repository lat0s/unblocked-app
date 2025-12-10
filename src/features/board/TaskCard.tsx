import { Brain, CalendarDays, Clock, Flag, ListChecks, Sparkles } from "lucide-react";

import { due, minutes } from "@/shared/format";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";

import type { Task } from "./api";

/** One task: title, then only the facts that help decide what to pull next. */
export function TaskCard({ task, onOpen, dragging }: { task: Task; onOpen: () => void; dragging?: boolean }) {
  const done = task.status === "done";
  const d = done ? null : due(task.dueDate);
  const sub = task.subtasks.length;
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group rounded-lg border-2 border-edge bg-card p-3 transition-[box-shadow,transform]",
        dragging ? "rotate-1 shadow-brutal-lg" : "shadow-brutal-sm hover:-translate-y-px hover:shadow-brutal",
        done && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        {(task.priority === "urgent" || task.priority === "high") && !done && (
          <Flag className={cn("mt-0.5 size-3.5 shrink-0", task.priority === "urgent" ? "fill-event text-event" : "text-event")} />
        )}
        <p className={cn("flex-1 leading-snug font-semibold", done && "line-through")}>{task.title}</p>
        {task.confidence != null && <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-label="Created from a note" />}
      </div>
      {task.nextAction && !done && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">→ {task.nextAction}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5 empty:hidden">
        {d && (
          <Badge tone={d.tone}>
            <CalendarDays /> {d.label}
          </Badge>
        )}
        {!!task.estimateMin && (
          <Badge>
            <Clock /> {minutes(task.estimateMin)}
          </Badge>
        )}
        {task.workType === "deep" && (
          <Badge tone="deep">
            <Brain /> Deep
          </Badge>
        )}
        {task.context && <Badge>{task.context}</Badge>}
        {sub > 0 && (
          <Badge tone={subDone === sub ? "done" : "default"}>
            <ListChecks /> {subDone}/{sub}
          </Badge>
        )}
      </div>
    </div>
  );
}
