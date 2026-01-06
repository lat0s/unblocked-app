import { useState } from "react";

import { KIND_LABEL, type EventKind } from "@/features/calendar/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input, Label, Select, Textarea } from "@/shared/ui/input";
import { cn } from "@/shared/utils";

import { useUpdateItem, type Item, type Kind, type Proposal } from "./api";

/** Edit a proposal before it goes anywhere. */
export function ProposalDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-2 border-edge shadow-brutal-lg sm:max-w-lg">
        {item && <Form key={item.id} item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const blank = (v: string) => (v.trim() ? v : null);

function Form({ item, onClose }: { item: Item; onClose: () => void }) {
  const [f, setF] = useState<Proposal>(item.proposal);
  const update = useUpdateItem();
  const set = <K extends keyof Proposal>(k: K, v: Proposal[K]) => setF((x) => ({ ...x, [k]: v }));
  const isEvent = f.kind === "event";

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ id: item.id, proposal: f }, { onSuccess: onClose });
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">Edit before accepting</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-1 rounded-lg border-2 border-edge bg-muted p-1">
        {(["task", "event"] as Kind[]).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => set("kind", k)}
            className={cn("h-8 rounded-md text-sm font-semibold", f.kind === k ? "bg-card shadow-brutal-sm" : "text-muted-foreground")}
          >
            {k === "task" ? "Task (board)" : "Event (calendar)"}
          </button>
        ))}
      </div>
      <Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} className="h-11 text-base font-semibold" />

      {isEvent ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={f.date ?? f.dueDate ?? ""} onChange={(e) => set("date", blank(e.target.value))} />
            </Field>
            <Field label="Kind">
              <Select value={f.eventKind ?? "meeting"} onChange={(e) => set("eventKind", e.target.value as EventKind)}>
                {Object.entries(KIND_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Starts">
              <Input type="time" value={f.startTime ?? ""} onChange={(e) => set("startTime", blank(e.target.value))} />
            </Field>
            <Field label="Ends">
              <Input type="time" value={f.endTime ?? ""} onChange={(e) => set("endTime", blank(e.target.value))} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" checked={f.deepWork} onChange={() => set("deepWork", !f.deepWork)} />
            Deep work block
          </label>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Due">
              <Input type="date" value={f.dueDate ?? f.date ?? ""} onChange={(e) => set("dueDate", blank(e.target.value))} />
            </Field>
            <Field label="Priority">
              <Select value={f.priority ?? "medium"} onChange={(e) => set("priority", e.target.value as Proposal["priority"])}>
                {["low", "medium", "high", "urgent"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Minutes">
              <Input
                type="number"
                min={5}
                step={5}
                value={f.estimateMin ?? ""}
                onChange={(e) => set("estimateMin", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
          <Field label="First step">
            <Input value={f.nextAction ?? ""} onChange={(e) => set("nextAction", blank(e.target.value))} />
          </Field>
          <Field label="Context">
            <Input placeholder="@computer, @phone…" value={f.context ?? ""} onChange={(e) => set("context", blank(e.target.value))} />
          </Field>
        </>
      )}
      <Field label="Notes">
        <Textarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", blank(e.target.value))} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!f.title.trim() || update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
