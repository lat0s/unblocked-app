import { describe, expect, it } from "vite-plus/test";

import type { Task } from "@/features/board/api";

import { doneThisWeek, greeting, nextUp } from "./plan";

let n = 0;
const task = (over: Partial<Task>): Task => ({
  id: String(n++),
  title: "t",
  notes: null,
  status: "todo",
  position: 0,
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
  createdAt: "",
  updatedAt: "",
  completedAt: null,
  ...over,
});

const today = new Date(2026, 0, 28, 10);

describe("nextUp", () => {
  it("orders doing, then pressing, then by priority", () => {
    const tasks = [
      task({ title: "low later", priority: "low" }),
      task({ title: "urgent later", priority: "urgent", dueDate: "2026-02-10" }),
      task({ title: "due today", dueDate: "2026-01-28" }),
      task({ title: "overdue", dueDate: "2026-01-20", priority: "low" }),
      task({ title: "doing", status: "doing" }),
      task({ title: "done", status: "done" }),
    ];
    expect(nextUp(tasks, today).map((t) => t.title)).toEqual(["doing", "overdue", "due today", "urgent later", "low later"]);
  });

  it("caps the list", () => {
    expect(nextUp([task({}), task({}), task({})], today, 2)).toHaveLength(2);
  });
});

describe("doneThisWeek", () => {
  it("counts completions since Monday", () => {
    const tasks = [
      task({ status: "done", completedAt: "2026-01-26T09:00:00Z" }),
      task({ status: "done", completedAt: "2026-01-24T09:00:00Z" }),
      task({}),
    ];
    expect(doneThisWeek(tasks, today)).toBe(1);
  });
});

describe("greeting", () => {
  it("follows the clock", () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });
});
