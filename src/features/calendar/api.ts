import { useQuery } from "@tanstack/react-query";

import type { Strategy } from "@/features/board/api";
import { call } from "@/shared/ipc";
import { useAction } from "@/shared/query";

export type EventKind = "meeting" | "time_block" | "reminder";

export type CalEvent = {
  id: string;
  title: string;
  notes: string | null;
  kind: EventKind;
  date: string;
  startTime: string | null;
  endTime: string | null;
  deepWork: boolean;
  strategies: Strategy[];
  confidence: number | null;
  sourceNote: string | null;
};

export type EventInput = Omit<CalEvent, "id" | "strategies" | "confidence" | "sourceNote"> &
  Partial<Pick<CalEvent, "strategies" | "confidence" | "sourceNote">>;

export const KIND_LABEL: Record<EventKind, string> = { meeting: "Meeting", time_block: "Time block", reminder: "Reminder" };

export const useEvents = (from: string, to: string) =>
  useQuery({ queryKey: ["events", from, to], queryFn: () => call<CalEvent[]>("events_list", { from, to }) });

export const useCreateEvent = () => useAction((input: EventInput) => call<CalEvent>("event_create", { input }), ["events"]);
export const useUpdateEvent = () => useAction((a: { id: string; input: EventInput }) => call<CalEvent>("event_update", a), ["events"]);
export const useDeleteEvent = () => useAction((id: string) => call<void>("event_delete", { id }), ["events"], { success: "Event deleted" });

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type Placed = { ev: CalEvent; start: number; end: number; lane: number; lanes: number };

/** Places timed events side by side when they overlap. Events without an end last an hour. */
export function layoutDay(events: CalEvent[]): Placed[] {
  const timed = events
    .filter((e) => e.startTime)
    .map((ev) => {
      const start = toMin(ev.startTime!);
      return { ev, start, end: ev.endTime ? toMin(ev.endTime) : start + 60, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Placed[] = [];
  let group: Placed[] = [];
  let groupEnd = -1;
  const flush = () => {
    const n = Math.max(...group.map((p) => p.lane)) + 1;
    for (const p of group) p.lanes = n;
    out.push(...group);
    group = [];
  };
  for (const p of timed) {
    if (group.length && p.start >= groupEnd) flush();
    const laneEnds: number[] = [];
    for (const g of group) laneEnds[g.lane] = Math.max(laneEnds[g.lane] ?? 0, g.end);
    let lane = laneEnds.findIndex((end) => end <= p.start);
    if (lane < 0) lane = laneEnds.length;
    p.lane = lane;
    group.push(p);
    groupEnd = Math.max(groupEnd, p.end);
  }
  if (group.length) flush();
  return out;
}
