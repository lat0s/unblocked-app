import { Check, Loader2, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";

import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/ui/button";

import { counts, useNotes } from "./api";
import { NoteHistory } from "./NoteHistory";
import { useDraft, type SaveState } from "./useDraft";

const PLACEHOLDER = `Everything on your mind, one thing per line.

finish the report for Anna by friday
dentist tuesday 10am
call mom
that thing about the car???`;

export function CapturePage() {
  const draft = useDraft();
  const { data: notes } = useNotes();
  const opened = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Pick up the latest unprocessed note once, so nothing typed gets lost between sessions.
  useEffect(() => {
    if (opened.current || !notes) return;
    opened.current = true;
    const last = notes.find((n) => !n.processedAt);
    if (last) void draft.open(last);
  }, [notes, draft]);

  const { lines, words } = counts(draft.body);

  return (
    <>
      <PageHeader title="Capture" sub="Dump everything. Sorting comes later.">
        <Button
          size="lg"
          variant="outline"
          className="border-2 border-edge shadow-brutal-sm"
          onClick={() => void draft.fresh().then(() => area.current?.focus())}
        >
          <Plus /> New note
        </Button>
      </PageHeader>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] gap-6 px-8 pb-8">
        <section className="flex min-h-0 flex-col rounded-xl border-2 border-edge bg-card shadow-brutal">
          <textarea
            ref={area}
            autoFocus
            spellCheck
            value={draft.body}
            placeholder={PLACEHOLDER}
            onChange={(e) => draft.edit(e.target.value)}
            className="paper min-h-0 flex-1 resize-none bg-transparent px-8 pt-[14px] pb-6 text-[17px] leading-8 outline-none placeholder:text-muted-foreground/70"
          />
          <footer className="flex items-center gap-4 border-t-2 border-edge px-5 py-3 text-sm">
            <span className="num text-muted-foreground">
              {lines} line{lines === 1 ? "" : "s"} · {words} word{words === 1 ? "" : "s"}
            </span>
            <SaveBadge state={draft.state} error={draft.error} />
            <div className="flex-1" />
          </footer>
        </section>
        <NoteHistory activeId={draft.id} onOpen={(n) => void draft.open(n)} onDeleted={(id) => id === draft.id && void draft.fresh()} />
      </div>
    </>
  );
}

function SaveBadge({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Saving
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-done">
        <Check className="size-3.5" /> Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1 text-destructive" title={error ?? ""}>
        <TriangleAlert className="size-3.5" /> Not saved
      </span>
    );
  return null;
}
