import { useQuery } from "@tanstack/react-query";

import { call } from "@/shared/ipc";
import { useAction } from "@/shared/query";

export type Note = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  itemCount: number;
};

export const useNotes = () => useQuery({ queryKey: ["notes"], queryFn: () => call<Note[]>("notes_list") });
export const saveNote = (id: string, body: string) => call<Note | null>("note_save", { id, body });
export const useDeleteNote = () => useAction((id: string) => call<void>("note_delete", { id }), ["notes"], { success: "Note deleted" });

export const newNoteId = () => crypto.randomUUID().replaceAll("-", "");

/** First non-empty line, shortened; what the history shows. */
export function noteTitle(body: string, max = 60): string {
  const line =
    body
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? "";
  if (!line) return "Empty note";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

export function counts(body: string) {
  const lines = body.split("\n").filter((l) => l.trim()).length;
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return { lines, words };
}
