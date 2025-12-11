import { addDays, addWeeks, format, isSameDay, isSameMonth, startOfWeek } from "date-fns";
import { Brain, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/shared/components/PageHeader";
import { isoDate } from "@/shared/format";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

import { layoutDay, useEvents, type CalEvent, type EventKind } from "./api";
import { EventDialog, type EventDraft } from "./EventDialog";

const FIRST_HOUR = 6;
const LAST_HOUR = 23;
const HOUR_PX = 56;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

const TONE: Record<EventKind, string> = {
  meeting: "bg-event/15 border-event text-foreground",
  time_block: "bg-task/15 border-task text-foreground",
  reminder: "bg-doing/30 border-doing text-foreground",
};

const tone = (e: CalEvent) => (e.deepWork ? "bg-deep/15 border-deep text-foreground" : TONE[e.kind]);

export function CalendarPage() {
  const [today] = useState(() => new Date());
  const [anchor, setAnchor] = useState(today);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const week = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);
  const { data: events = [] } = useEvents(isoDate(week[0]), isoDate(week[6]));
  const scroller = useRef<HTMLDivElement>(null);

  // Start scrolled to the morning.
  useEffect(() => {
    scroller.current?.scrollTo({ top: (8 - FIRST_HOUR) * HOUR_PX });
  }, []);

  const byDay = (d: Date) => events.filter((e) => e.date === isoDate(d));
  const title = isSameMonth(week[0], week[6]) ? format(week[0], "MMMM yyyy") : `${format(week[0], "MMM")} – ${format(week[6], "MMM yyyy")}`;
  const nowMin = today.getHours() * 60 + today.getMinutes();

  return (
    <>
      <PageHeader title="Calendar" sub={title}>
        <div className="flex items-center rounded-lg border-2 border-edge bg-card shadow-brutal-sm">
          <Button variant="ghost" size="icon" onClick={() => setAnchor((a) => addWeeks(a, -1))} aria-label="Previous week">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" className="px-3 font-semibold" onClick={() => setAnchor(today)}>
            This week
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAnchor((a) => addWeeks(a, 1))} aria-label="Next week">
            <ChevronRight />
          </Button>
        </div>
        <Button
          size="lg"
          className="border-2 border-edge shadow-brutal-sm"
          onClick={() => setDraft({ date: isoDate(today), startTime: "09:00" })}
        >
          <Plus /> New event
        </Button>
      </PageHeader>

      <div className="mx-8 mb-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-edge bg-card shadow-brutal">
        {/* Day headers and all-day row */}
        <div className="grid shrink-0 grid-cols-[56px_repeat(7,1fr)] border-b-2 border-edge">
          <div />
          {week.map((d) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={d.toISOString()} className="border-l border-border px-2 pt-2 pb-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{format(d, "EEE")}</span>
                  <span
                    className={cn(
                      "num grid size-7 place-items-center rounded-full font-heading text-sm",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
                <div className="mt-1 flex min-h-6 flex-col gap-1">
                  {byDay(d)
                    .filter((e) => !e.startTime)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setDraft({ event: e, date: e.date })}
                        className={cn("truncate rounded-sm border-l-[3px] px-1.5 py-0.5 text-left text-xs font-semibold", tone(e))}
                      >
                        {e.title}
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour grid */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: HOURS.length * HOUR_PX }}>
            <div>
              {HOURS.map((h) => (
                <div key={h} className="num relative pr-2 text-right text-[11px] text-muted-foreground" style={{ height: HOUR_PX }}>
                  <span className="relative -top-2">{h === FIRST_HOUR ? "" : `${String(h).padStart(2, "0")}:00`}</span>
                </div>
              ))}
            </div>
            {week.map((d) => {
              const placed = layoutDay(byDay(d));
              const isToday = isSameDay(d, today);
              return (
                <div key={d.toISOString()} className={cn("relative border-l border-border", isToday && "bg-secondary/40")}>
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      aria-label={`New event ${format(d, "EEE")} ${h}:00`}
                      onClick={() => setDraft({ date: isoDate(d), startTime: `${String(h).padStart(2, "0")}:00` })}
                      className="block w-full border-b border-border/70 hover:bg-secondary/60"
                      style={{ height: HOUR_PX }}
                    />
                  ))}
                  {isToday && nowMin >= FIRST_HOUR * 60 && (
                    <div
                      className="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-event"
                      style={{ top: ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_PX }}
                    >
                      <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-event" />
                    </div>
                  )}
                  {placed.map(({ ev, start, end, lane, lanes }) => {
                    const top = Math.max(0, ((start - FIRST_HOUR * 60) / 60) * HOUR_PX);
                    const height = Math.max(22, ((end - start) / 60) * HOUR_PX - 2);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setDraft({ event: ev, date: ev.date })}
                        className={cn(
                          "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs shadow-sm transition-transform hover:z-20 hover:-translate-y-px",
                          tone(ev),
                        )}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                      >
                        <p className="flex items-center gap-1 leading-tight font-semibold">
                          {ev.deepWork && <Brain className="size-3 shrink-0 text-deep" />}
                          <span className="truncate">{ev.title}</span>
                        </p>
                        {height > 34 && (
                          <p className="num text-[11px] text-muted-foreground">
                            {ev.startTime}
                            {ev.endTime && `–${ev.endTime}`}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
