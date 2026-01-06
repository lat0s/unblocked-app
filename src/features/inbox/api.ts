import { useQuery } from "@tanstack/react-query";

import type { Priority, Strategy, Subtask } from "@/features/board/api";
import type { EventKind } from "@/features/calendar/api";
import { call } from "@/shared/ipc";
import { useAction } from "@/shared/query";

export type Kind = "task" | "event";

export type Proposal = {
  kind: Kind;
  title: string;
  notes: string | null;
  priority: Priority | null;
  workType: "deep" | "shallow" | null;
  energy: "low" | "medium" | "high" | null;
  estimateMin: number | null;
  context: string | null;
  dueDate: string | null;
  nextAction: string | null;
  subtasks: Subtask[];
  eventKind: EventKind | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  deepWork: boolean;
  strategies: Strategy[];
  confidence: number | null;
};

export type Item = { id: string; noteId: string | null; proposal: Proposal; createdAt: string };
export type Placed = { kind: Kind; id: string };

const KEYS = ["inbox", "tasks", "events"];

export const useInbox = () => useQuery({ queryKey: ["inbox"], queryFn: () => call<Item[]>("inbox_list") });
export const useUpdateItem = () => useAction((a: { id: string; proposal: Proposal }) => call<Item>("inbox_update", a), ["inbox"]);
export const useAccept = () => useAction((id: string) => call<Placed>("inbox_accept", { id }), KEYS);
export const useAcceptNote = () => useAction((noteId: string) => call<Placed[]>("inbox_accept_note", { noteId }), KEYS);
export const useDismiss = () => useAction((id: string) => call<void>("inbox_dismiss", { id }), ["inbox"]);

/** Items grouped by the note they came from, newest note first. */
export function groupByNote(items: Item[]): { noteId: string | null; items: Item[] }[] {
  const groups = new Map<string | null, Item[]>();
  for (const i of items) {
    const g = groups.get(i.noteId);
    if (g) g.push(i);
    else groups.set(i.noteId, [i]);
  }
  return [...groups].map(([noteId, items]) => ({ noteId, items }));
}

/** Why the user should look twice before accepting, or null. */
export function reviewReason(p: Proposal): string | null {
  if (p.kind === "event" && !(p.date ?? p.dueDate)) return "Needs a date";
  if (p.confidence != null && p.confidence < 0.6) return "Unsure, check this";
  return null;
}
