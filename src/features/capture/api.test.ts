import { describe, expect, it } from "vite-plus/test";

import { counts, noteTitle } from "./api";

describe("noteTitle", () => {
  it("uses the first non-empty line", () => {
    expect(noteTitle("\n  \n  call mom  \nbuy milk")).toBe("call mom");
  });
  it("shortens long lines", () => {
    expect(noteTitle("a".repeat(80), 10)).toBe("aaaaaaaaa…");
  });
  it("names empty notes", () => {
    expect(noteTitle("   ")).toBe("Empty note");
  });
});

describe("counts", () => {
  it("counts non-empty lines and words", () => {
    expect(counts("call mom\n\n buy  milk \n")).toEqual({ lines: 2, words: 4 });
    expect(counts("")).toEqual({ lines: 0, words: 0 });
  });
});
