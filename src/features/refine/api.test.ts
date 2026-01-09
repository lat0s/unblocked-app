import { describe, expect, it } from "vite-plus/test";

import { missing, refLabel, type Question } from "./api";

const q = (id: string, required: boolean): Question => ({
  id,
  kind: "context",
  label: id,
  placeholder: null,
  required,
  refs: [],
  options: [],
  quotes: [],
});

describe("missing", () => {
  it("lists required questions without an answer", () => {
    const qs = [q("a", true), q("b", true), q("c", false)];
    expect(missing(qs, { a: "x", b: "  " }).map((x) => x.id)).toEqual(["b"]);
  });
});

describe("refLabel", () => {
  it("reads like the editor", () => {
    expect(refLabel("line-12")).toBe("Line 12");
  });
});
