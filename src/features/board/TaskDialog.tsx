import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { pct } from "@/shared/format";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input, Label, Select, Textarea } from "@/shared/ui/input";

import { useCreateTask, useDeleteTask, useUpdateTask, type Status, type Subtask, type Task, type TaskInput } from "./api";

type Props = { task?: Task | null; status?: Status; open: boolean; onClose: () => void };

const empty: TaskInput = { title: "", priority: "medium", workType: "shallow", energy: "medium", subtasks: [] };

/** Create or edit a task. Opening with no task creates one in `status`. */
export function TaskDialog({ task, status = "todo", open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-2 border-edge shadow-brutal-lg sm:max-w-xl">
        {open && <TaskForm key={task?.id ?? "new"} task={task ?? null} status={status} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({ task, status, onClose }: { task: Task | null; status: Status; onClose: () => void }) {
  const [f, setF] = useState<TaskInput>(() => (task ? { ...task } : { ...empty, status }));
  const [newSub, setNewSub] = useState("");
  const create = useCreateTask();
  const update = useUpdateTask();
  const del = useDeleteTask();
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const subs = f.subtasks ?? [];
  const setSubs = (s: Subtask[]) => set("subtasks", s);

  const save = async () => {
    const input: TaskInput = { ...f, estimateMin: f.estimateMin ? Number(f.estimateMin) : null };
    if (task) await update.mutateAsync({ id: task.id, input });
    else await create.mutateAsync(input);
    onClose();
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{task ? "Edit task" : "New task"}</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        placeholder="What needs doing?"
        value={f.title ?? ""}
        onChange={(e) => set("title", e.target.value)}
        className="h-11 text-base font-semibold"
      />
      <div className="grid gap-1.5">
        <Label>Next action</Label>
        <Input placeholder="The very first physical step" value={f.nextAction ?? ""} onChange={(e) => set("nextAction", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Due</Label>
          <Input type="date" value={f.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Estimate (min)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={f.estimateMin ?? ""}
            onChange={(e) => set("estimateMin", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Context</Label>
          <Input placeholder="@computer" value={f.context ?? ""} onChange={(e) => set("context", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Priority</Label>
          <Select value={f.priority} onChange={(e) => set("priority", e.target.value as Task["priority"])}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Work</Label>
          <Select value={f.workType} onChange={(e) => set("workType", e.target.value as Task["workType"])}>
            <option value="shallow">Shallow</option>
            <option value="deep">Deep</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Energy</Label>
          <Select value={f.energy} onChange={(e) => set("energy", e.target.value as Task["energy"])}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Steps</Label>
        {subs.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={s.done}
              onChange={() => setSubs(subs.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
            />
            <span className={s.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{s.title}</span>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSubs(subs.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Add a step"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSub.trim()) {
                e.preventDefault();
                setSubs([...subs, { title: newSub.trim(), done: false }]);
                setNewSub("");
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            disabled={!newSub.trim()}
            onClick={() => {
              setSubs([...subs, { title: newSub.trim(), done: false }]);
              setNewSub("");
            }}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea rows={3} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {task && task.strategies.length > 0 && (
        <div className="rounded-lg bg-secondary p-3 text-xs">
          <p className="mb-1.5 font-semibold">
            Why it looks like this <span className="font-normal text-muted-foreground">· AI confidence {pct(task.confidence)}</span>
          </p>
          {task.strategies.map((s, i) => (
            <p key={i} className="text-muted-foreground">
              <span className="font-medium text-foreground">{s.principle.replaceAll("_", " ")}</span>: {s.explanation}
            </p>
          ))}
        </div>
      )}
      <DialogFooter className="items-center">
        {task && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={async () => {
              await del.mutateAsync(task.id);
              onClose();
            }}
          >
            <Trash2 /> Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!f.title?.trim() || create.isPending || update.isPending}>
          {task ? "Save" : "Add task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
