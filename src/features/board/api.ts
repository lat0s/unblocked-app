import { useQuery } from "@tanstack/react-query";

import { call } from "@/shared/ipc";
import { useAction } from "@/shared/query";

export type Status = "todo" | "doing" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Subtask = { title: string; done: boolean };
export type Strategy = { method: string; principle: string; explanation: string };

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: Status;
  position: number;
  priority: Priority;
  workType: "deep" | "shallow";
  energy: "low" | "medium" | "high";
  estimateMin: number | null;
  context: string | null;
  dueDate: string | null;
  nextAction: string | null;
  subtasks: Subtask[];
  strategies: Strategy[];
  confidence: number | null;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskInput = Partial<Omit<Task, "id" | "position" | "createdAt" | "updatedAt" | "completedAt">>;

export const COLUMNS: { id: Status; label: string; hint: string }[] = [
  { id: "todo", label: "To do", hint: "Pull from here when you are ready" },
  { id: "doing", label: "Doing", hint: "Keep this short" },
  { id: "done", label: "Done", hint: "Proof you moved" },
];

/** Work-in-progress limit for "Doing" (Personal Kanban). */
export const WIP_LIMIT = 3;

export const useTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => call<Task[]>("tasks_list") });

export const useCreateTask = () => useAction((input: TaskInput) => call<Task>("task_create", { input }), ["tasks"]);
export const useUpdateTask = () => useAction((a: { id: string; input: TaskInput }) => call<Task>("task_update", a), ["tasks"]);
export const useMoveTask = () => useAction((a: { id: string; status: Status; index: number }) => call<Task>("task_move", a), ["tasks"]);
export const useDeleteTask = () => useAction((id: string) => call<void>("task_delete", { id }), ["tasks"], { success: "Task deleted" });

/** Groups tasks by column, keeping server order. */
export function byColumn(tasks: Task[]): Record<Status, Task[]> {
  const out: Record<Status, Task[]> = { todo: [], doing: [], done: [] };
  for (const t of tasks) out[t.status].push(t);
  for (const k of Object.keys(out) as Status[]) out[k].sort((a, b) => a.position - b.position);
  return out;
}

/** Local reorder so a drop shows instantly; the server result replaces it. */
export function applyMove(tasks: Task[], id: string, to: Status, index: number): Task[] {
  const cols = byColumn(tasks);
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;
  for (const k of Object.keys(cols) as Status[]) cols[k] = cols[k].filter((t) => t.id !== id);
  cols[to].splice(index, 0, { ...moving, status: to });
  return (Object.keys(cols) as Status[]).flatMap((k) => cols[k].map((t, i) => ({ ...t, position: i })));
}
