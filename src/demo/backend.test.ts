import { describe, expect, it } from "vite-plus/test";

import type { Task } from "@/features/board/api";
import type { Item } from "@/features/inbox/api";

import { demoInvoke, resetDemo } from "./backend";

describe("demo backend", () => {
  it("moves a task into done and renumbers the column", async () => {
    resetDemo();
    await demoInvoke("task_move", { id: "t3", status: "done", index: 0 });
    const done = (await demoInvoke<Task[]>("tasks_list")).filter((t) => t.status === "done");
    expect(done.map((t) => t.id)).toEqual(["t3", "t8", "t9"]);
    expect(done.map((t) => t.position)).toEqual([0, 1, 2]);
    expect(done[0]?.completedAt).toBeTruthy();
  });

  it("accepts a whole note or nothing", async () => {
    resetDemo();
    const [first] = await demoInvoke<Item[]>("inbox_list");
    await demoInvoke("inbox_update", { id: first!.id, proposal: { ...first!.proposal, kind: "event", date: null, dueDate: null } });
    await expect(demoInvoke("inbox_accept_note", { noteId: "n1" })).rejects.toMatchObject({ kind: "invalidInput" });
    expect(await demoInvoke<Item[]>("inbox_list")).toHaveLength(5);
  });

  it("refuses AI work", async () => {
    await expect(demoInvoke("refine_start", { noteId: "n1" })).rejects.toMatchObject({ kind: "notConfigured" });
    await expect(demoInvoke("ai_set_key", { provider: "gemini", key: "x" })).rejects.toMatchObject({ kind: "notConfigured" });
  });
});
