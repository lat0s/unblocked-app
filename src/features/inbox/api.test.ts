import { describe, expect, it } from "vite-plus/test";

import { groupByNote, reviewReason, type Item, type Proposal } from "./api";

const p = (over: Partial<Proposal> = {}): Proposal => ({
  kind: "task",
  title: "x",
  notes: null,
  priority: null,
  workType: null,
  energy: null,
  estimateMin: null,
  context: null,
  dueDate: null,
  nextAction: null,
  subtasks: [],
  eventKind: null,
  date: null,
  startTime: null,
  endTime: null,
  deepWork: false,
  strategies: [],
  confidence: 0.9,
  ...over,
});

const item = (id: string, noteId: string | null): Item => ({ id, noteId, proposal: p(), createdAt: "" });

describe("groupByNote", () => {
  it("keeps first-seen order and groups items", () => {
    const g = groupByNote([item("a", "n2"), item("b", "n1"), item("c", "n2"), item("d", null)]);
    expect(g.map((x) => [x.noteId, x.items.map((i) => i.id)])).toEqual([
      ["n2", ["a", "c"]],
      ["n1", ["b"]],
      [null, ["d"]],
    ]);
  });
});

describe("reviewReason", () => {
  it("flags events without a date", () => {
    expect(reviewReason(p({ kind: "event" }))).toBe("Needs a date");
    expect(reviewReason(p({ kind: "event", date: "2026-01-12" }))).toBeNull();
  });
  it("flags low confidence", () => {
    expect(reviewReason(p({ confidence: 0.4 }))).toBe("Unsure, check this");
    expect(reviewReason(p({ confidence: null }))).toBeNull();
  });
});
