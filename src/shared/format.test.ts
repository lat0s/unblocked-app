import { describe, expect, it } from "vite-plus/test";

import { due, minutes } from "./format";

describe("minutes", () => {
  it("formats short and long durations", () => {
    expect(minutes(45)).toBe("45 min");
    expect(minutes(90)).toBe("1 h 30");
    expect(minutes(120)).toBe("2 h");
    expect(minutes(0)).toBe("");
    expect(minutes(null)).toBe("");
  });
});

describe("due", () => {
  const today = new Date(2026, 2, 11); // Wed 11 Mar 2026
  it("labels relative to today", () => {
    expect(due("2026-03-09", today)).toEqual({ label: "Overdue 2d", tone: "danger" });
    expect(due("2026-03-11", today)?.label).toBe("Today");
    expect(due("2026-03-12", today)?.label).toBe("Tomorrow");
    expect(due("2026-03-13", today)?.label).toBe("Friday");
    expect(due("2026-03-30", today)?.label).toBe("Mon 30 Mar");
    expect(due(null, today)).toBeNull();
  });
});
