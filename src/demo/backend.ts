import type { Status, Task, TaskInput } from "@/features/board/api";
import type { CalEvent, EventInput } from "@/features/calendar/api";
import type { Item, Placed, Proposal } from "@/features/inbox/api";
import type { AiSettings } from "@/features/settings/api";
import { AppError } from "@/shared/ipc";
import { DEMO_AI_MESSAGE } from "@/shared/runtime";

import { type DemoState, seed } from "./seed";

// Browser-only stand-in for the Rust backend. Same commands, same rules, data in localStorage.
const KEY = "unblocked-demo-v1";
const DEFAULT_AI: AiSettings = { provider: "gemini", model: "gemini-2.5-flash", store: null };

let state: DemoState = load();

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return seed();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not persisted; the demo still works for this visit.
  }
}

/** Puts the sample data back. */
export function resetDemo() {
  state = seed();
  save();
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID().replaceAll("-", "");
const noAi = () => new AppError("notConfigured", DEMO_AI_MESSAGE);
const notFound = (what: string) => new AppError("notFound", `${what} not found`);

function findTask(id: string) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) throw notFound("Task");
  return t;
}

const sortedTasks = () => [...state.tasks].sort((a, b) => a.status.localeCompare(b.status) || a.position - b.position);

function moveTo(id: string, status: Status, index: number): Task {
  const task = findTask(id);
  const column = state.tasks.filter((t) => t.status === status && t.id !== id).sort((a, b) => a.position - b.position);
  column.splice(Math.min(Math.max(index, 0), column.length), 0, task);
  column.forEach((t, i) => (t.position = i));
  if (status === "done") task.completedAt = task.status === "done" && task.completedAt ? task.completedAt : now();
  else task.completedAt = null;
  task.status = status;
  task.updatedAt = now();
  return task;
}

function createTask(input: TaskInput): Task {
  const title = input.title?.trim();
  if (!title) throw new AppError("invalidInput", "A task needs a title");
  const status = input.status ?? "todo";
  const top = Math.min(0, ...state.tasks.filter((t) => t.status === status).map((t) => t.position));
  const at = now();
  const task: Task = {
    notes: null,
    priority: "medium",
    workType: "shallow",
    energy: "medium",
    estimateMin: null,
    context: null,
    dueDate: null,
    nextAction: null,
    subtasks: [],
    strategies: [],
    confidence: null,
    sourceNote: null,
    ...input,
    id: uid(),
    title,
    status,
    position: top - 1,
    createdAt: at,
    updatedAt: at,
    completedAt: status === "done" ? at : null,
  };
  state.tasks.push(task);
  return task;
}

function updateTask(id: string, input: TaskInput): Task {
  const task = findTask(id);
  const { status, ...rest } = input;
  for (const [k, v] of Object.entries(rest)) if (v !== undefined) (task as Record<string, unknown>)[k] = v;
  task.updatedAt = now();
  return status && status !== task.status ? moveTo(id, status, 0) : task;
}

function createEvent(input: EventInput): CalEvent {
  if (!input.title?.trim()) throw new AppError("invalidInput", "An event needs a title");
  const ev: CalEvent = { strategies: [], confidence: null, sourceNote: null, ...input, title: input.title.trim(), id: uid() };
  state.events.push(ev);
  return ev;
}

function place(p: Proposal, noteId: string | null): Placed {
  const extra = { strategies: p.strategies, confidence: p.confidence, sourceNote: noteId };
  if (p.kind === "event") {
    const date = p.date ?? p.dueDate;
    if (!date) throw new AppError("invalidInput", `"${p.title}" needs a date to go on the calendar`);
    const ev = createEvent({
      title: p.title,
      notes: p.notes,
      kind: p.eventKind ?? "meeting",
      date,
      startTime: p.startTime,
      endTime: p.endTime,
      deepWork: p.deepWork,
      ...extra,
    });
    return { kind: "event", id: ev.id };
  }
  const t = createTask({
    title: p.title,
    notes: p.notes,
    priority: p.priority ?? "medium",
    workType: p.workType ?? "shallow",
    energy: p.energy ?? "medium",
    estimateMin: p.estimateMin,
    context: p.context,
    dueDate: p.dueDate ?? p.date,
    nextAction: p.nextAction,
    subtasks: p.subtasks,
    ...extra,
  });
  return { kind: "task", id: t.id };
}

function findItem(id: string): Item {
  const it = state.inbox.find((x) => x.id === id);
  if (!it) throw notFound("Suggestion");
  return it;
}

// Runs fn on a copy so a failure leaves the data untouched, like a transaction.
function tx<T>(fn: () => T): T {
  const before = structuredClone(state);
  try {
    const out = fn();
    save();
    return out;
  } catch (e) {
    state = before;
    throw e;
  }
}

type Args = Record<string, any>;
const handlers: Record<string, (a: Args) => unknown> = {
  app_info: () => ({ version: "web demo", dbPath: "Browser storage (this device only)", logFile: "Browser console" }),
  log_client: () => null,
  pref_get: (a) => state.kv[a.key] ?? null,
  pref_set: (a) => void (state.kv[a.key] = a.value),

  notes_list: () => [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50),
  note_save: (a) => {
    const note = state.notes.find((n) => n.id === a.id);
    if (note) return Object.assign(note, { body: a.body, updatedAt: now() });
    if (!String(a.body).trim()) return null;
    const at = now();
    const fresh = { id: a.id, body: a.body, createdAt: at, updatedAt: at, processedAt: null, itemCount: 0 };
    state.notes.push(fresh);
    return fresh;
  },
  note_delete: (a) => {
    if (!state.notes.some((n) => n.id === a.id)) throw notFound("Note");
    state.notes = state.notes.filter((n) => n.id !== a.id);
    state.inbox = state.inbox.filter((i) => i.noteId !== a.id);
  },

  tasks_list: sortedTasks,
  task_create: (a) => createTask(a.input),
  task_update: (a) => updateTask(a.id, a.input),
  task_move: (a) => moveTo(a.id, a.status, a.index),
  task_delete: (a) => {
    findTask(a.id);
    state.tasks = state.tasks.filter((t) => t.id !== a.id);
  },

  events_list: (a) =>
    state.events
      .filter((e) => e.date >= a.from && e.date <= a.to)
      .sort(
        (x, y) =>
          x.date.localeCompare(y.date) ||
          Number(!!x.startTime) - Number(!!y.startTime) ||
          (x.startTime ?? "").localeCompare(y.startTime ?? ""),
      ),
  event_create: (a) => createEvent(a.input),
  event_update: (a) => {
    const ev = state.events.find((e) => e.id === a.id);
    if (!ev) throw notFound("Event");
    return Object.assign(ev, a.input, { id: ev.id });
  },
  event_delete: (a) => {
    if (!state.events.some((e) => e.id === a.id)) throw notFound("Event");
    state.events = state.events.filter((e) => e.id !== a.id);
  },

  inbox_list: () => [...state.inbox].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  inbox_update: (a) => Object.assign(findItem(a.id), { proposal: a.proposal }),
  inbox_accept: (a) => {
    const it = findItem(a.id);
    const placed = place(it.proposal, it.noteId);
    state.inbox = state.inbox.filter((x) => x.id !== a.id);
    return placed;
  },
  inbox_accept_note: (a) => {
    const items = state.inbox.filter((x) => x.noteId === a.noteId);
    const placed = items.map((it) => place(it.proposal, it.noteId));
    state.inbox = state.inbox.filter((x) => x.noteId !== a.noteId);
    return placed;
  },
  inbox_dismiss: (a) => {
    findItem(a.id);
    state.inbox = state.inbox.filter((x) => x.id !== a.id);
  },

  ai_status: () => ({ settings: aiSettings(), keySource: "none" }),
  ai_save_settings: (a) => {
    state.kv.ai = JSON.stringify(a.settings);
    return { settings: aiSettings(), keySource: "none" };
  },
  ai_clear_key: () => null,
  ai_set_key: () => {
    throw noAi();
  },
  ai_models: () => {
    throw noAi();
  },
  ai_test: () => {
    throw noAi();
  },
  refine_start: () => {
    throw noAi();
  },
  refine_finish: () => {
    throw noAi();
  },
};

function aiSettings(): AiSettings {
  try {
    return state.kv.ai ? (JSON.parse(state.kv.ai) as AiSettings) : DEFAULT_AI;
  } catch {
    return DEFAULT_AI;
  }
}

export async function demoInvoke<T>(cmd: string, args: Args = {}): Promise<T> {
  const fn = handlers[cmd];
  if (!fn) throw new AppError("failed", `Unknown command ${cmd}`);
  // Small delay so loading states look like the app.
  await new Promise((r) => setTimeout(r, 60));
  return structuredClone(tx(() => fn(args))) as T;
}
