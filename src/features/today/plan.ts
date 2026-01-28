import { differenceInCalendarDays, parseISO, startOfWeek } from "date-fns";

import type { Priority, Task } from "@/features/board/api";

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** What to work on now: everything in Doing, then overdue and due-today tasks, then the most important of the rest. */
export function nextUp(tasks: Task[], today: Date, max = 5): Task[] {
  const doing = tasks.filter((t) => t.status === "doing").sort((a, b) => a.position - b.position);
  const todo = tasks.filter((t) => t.status === "todo");
  const days = (t: Task) => (t.dueDate ? differenceInCalendarDays(parseISO(t.dueDate), today) : Infinity);
  const pressing = todo.filter((t) => days(t) <= 0).sort((a, b) => days(a) - days(b) || RANK[a.priority] - RANK[b.priority]);
  const rest = todo
    .filter((t) => days(t) > 0)
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || days(a) - days(b) || a.position - b.position);
  return [...doing, ...pressing, ...rest].slice(0, max);
}

/** Tasks finished since Monday. */
export function doneThisWeek(tasks: Task[], today: Date): number {
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return tasks.filter((t) => t.completedAt && parseISO(t.completedAt) >= monday).length;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
