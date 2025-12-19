import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { errText } from "@/shared/ipc";

import { newNoteId, saveNote, type Note } from "./api";

export type SaveState = "idle" | "saving" | "saved" | "error";

const DELAY_MS = 600;

/** The note being written: saved shortly after typing stops, and before switching notes. */
export function useDraft() {
  const qc = useQueryClient();
  const [id, setId] = useState(newNoteId);
  const [body, setBody] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ id: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setState("saving");
    try {
      await saveNote(p.id, p.body);
      setState("saved");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["notes"] });
    } catch (e) {
      setState("error");
      setError(errText(e));
    }
  }, [qc]);

  useEffect(() => () => void flush(), [flush]);

  const edit = (text: string) => {
    setBody(text);
    pending.current = { id, body: text };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DELAY_MS);
  };

  const open = async (note: Note) => {
    await flush();
    setId(note.id);
    setBody(note.body);
    setState("idle");
  };

  const fresh = async () => {
    await flush();
    setId(newNoteId());
    setBody("");
    setState("idle");
  };

  return { id, body, state, error, edit, open, fresh, flush };
}
