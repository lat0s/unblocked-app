import { differenceInCalendarDays, format, parseISO } from "date-fns";

/** 45 → "45 min", 90 → "1 h 30", 120 → "2 h". */
export function minutes(m: number | null | undefined): string {
  if (!m || m <= 0) return "";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r}` : `${h} h`;
}

/** Due date relative to `today`: "Overdue 2d", "Today", "Tomorrow", "Fri 14 Mar". */
export function due(date: string | null | undefined, today = new Date()): { label: string; tone: "danger" | "warn" | "default" } | null {
  if (!date) return null;
  const d = parseISO(date);
  const diff = differenceInCalendarDays(d, today);
  if (diff < 0) return { label: `Overdue ${-diff}d`, tone: "danger" };
  if (diff === 0) return { label: "Today", tone: "warn" };
  if (diff === 1) return { label: "Tomorrow", tone: "default" };
  if (diff < 7) return { label: format(d, "EEEE"), tone: "default" };
  return { label: format(d, "EEE d MMM"), tone: "default" };
}

/** Local date as YYYY-MM-DD. */
export const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

export const pct = (x: number | null | undefined) => (x == null ? "" : `${Math.round(x * 100)}%`);
