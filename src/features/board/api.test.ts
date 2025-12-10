import { describe, expect, it } from "vite-plus/test";

import { applyMove, byColumn, type Task } from "./api";

const t = (id: string, status: Task["status"], position: number) => ({ id, status, position }) as Task;

describe("applyMove", () => {
  it("moves across columns and renumbers", () => {
    const tasks = [t("a", "todo", 0), t("b", "todo", 1), t("c", "doing", 0)];
    const cols = byColumn(applyMove(tasks, "a", "doing", 1));
    expect(cols.todo.map((x) => x.id)).toEqual(["b"]);
    expect(cols.doing.map((x) => x.id)).toEqual(["c", "a"]);
  });

  it("reorders inside a column", () => {
    const tasks = [t("a", "todo", 0), t("b", "todo", 1), t("c", "todo", 2)];
    expect(byColumn(applyMove(tasks, "c", "todo", 0)).todo.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});
