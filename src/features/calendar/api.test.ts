import { describe, expect, it } from "vite-plus/test";

import { layoutDay, type CalEvent } from "./api";

const ev = (id: string, startTime: string | null, endTime: string | null = null) => ({ id, startTime, endTime }) as CalEvent;

describe("layoutDay", () => {
  it("puts overlapping events in lanes", () => {
    const placed = layoutDay([ev("a", "09:00", "10:00"), ev("b", "09:30", "10:30"), ev("c", "11:00", "12:00")]);
    const by = Object.fromEntries(placed.map((p) => [p.ev.id, p]));
    expect([by.a.lane, by.a.lanes]).toEqual([0, 2]);
    expect([by.b.lane, by.b.lanes]).toEqual([1, 2]);
    expect([by.c.lane, by.c.lanes]).toEqual([0, 1]);
  });

  it("reuses a lane once it is free and skips all-day events", () => {
    const placed = layoutDay([ev("a", "09:00", "12:00"), ev("b", "09:00", "09:30"), ev("c", "10:00"), ev("d", null)]);
    expect(placed.map((p) => [p.ev.id, p.lane])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 1],
    ]);
    expect(placed[0].lanes).toBe(2);
  });
});
