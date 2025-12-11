import { Trash2 } from "lucide-react";
import { useState } from "react";

import { pct } from "@/shared/format";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input, Label, Select, Textarea } from "@/shared/ui/input";

import { KIND_LABEL, useCreateEvent, useDeleteEvent, useUpdateEvent, type CalEvent, type EventInput, type EventKind } from "./api";

export type EventDraft = { event?: CalEvent; date: string; startTime?: string | null };

/** Create or edit an event. A draft without `event` creates one. */
export function EventDialog({ draft, onClose }: { draft: EventDraft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-2 border-edge shadow-brutal-lg sm:max-w-lg">
        {draft && <EventForm key={draft.event?.id ?? `${draft.date}-${draft.startTime}`} draft={draft} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const plusHour = (t: string) => `${String(Math.min(23, Number(t.slice(0, 2)) + 1)).padStart(2, "0")}${t.slice(2)}`;

function EventForm({ draft, onClose }: { draft: EventDraft; onClose: () => void }) {
  const e = draft.event;
  const [f, setF] = useState<EventInput>(() =>
    e
      ? { ...e }
      : {
          title: "",
          notes: null,
          kind: "meeting",
          date: draft.date,
          startTime: draft.startTime ?? null,
          endTime: draft.startTime ? plusHour(draft.startTime) : null,
          deepWork: false,
        },
  );
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const del = useDeleteEvent();
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const allDay = !f.startTime;

  const save = async () => {
    if (e) await update.mutateAsync({ id: e.id, input: f });
    else await create.mutateAsync(f);
    onClose();
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{e ? "Edit event" : "New event"}</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        placeholder="Title"
        value={f.title}
        onChange={(x) => set("title", x.target.value)}
        className="h-11 text-base font-semibold"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Date</Label>
          <Input type="date" required value={f.date} onChange={(x) => set("date", x.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Kind</Label>
          <Select value={f.kind} onChange={(x) => set("kind", x.target.value as EventKind)}>
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={allDay}
          onChange={() =>
            allDay ? setF((x) => ({ ...x, startTime: "09:00", endTime: "10:00" })) : setF((x) => ({ ...x, startTime: null, endTime: null }))
          }
        />
        All day
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Starts</Label>
            <Input type="time" value={f.startTime ?? ""} onChange={(x) => set("startTime", x.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Ends</Label>
            <Input type="time" value={f.endTime ?? ""} onChange={(x) => set("endTime", x.target.value || null)} />
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-primary" checked={f.deepWork} onChange={() => set("deepWork", !f.deepWork)} />
        Deep work block (protect it from meetings)
      </label>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea rows={3} value={f.notes ?? ""} onChange={(x) => set("notes", x.target.value)} />
      </div>
      {e && e.strategies.length > 0 && (
        <div className="rounded-lg bg-secondary p-3 text-xs">
          <p className="mb-1 font-semibold">
            From a note <span className="font-normal text-muted-foreground">· AI confidence {pct(e.confidence)}</span>
          </p>
          {e.strategies.map((s, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="font-medium text-foreground">{s.principle.replaceAll("_", " ")}</span>: {s.explanation}
            </p>
          ))}
        </div>
      )}
      <DialogFooter className="items-center">
        {e && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={async () => {
              await del.mutateAsync(e.id);
              onClose();
            }}
          >
            <Trash2 /> Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!f.title.trim() || !f.date || create.isPending || update.isPending}>
          {e ? "Save" : "Add event"}
        </Button>
      </DialogFooter>
    </form>
  );
}
