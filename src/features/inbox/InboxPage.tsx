import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { CheckCheck, NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useNav } from "@/app/nav";
import { noteTitle, useNotes } from "@/features/capture/api";
import { Empty } from "@/shared/components/Empty";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/ui/button";

import { groupByNote, useAcceptNote, useInbox, type Item } from "./api";
import { ProposalCard } from "./ProposalCard";
import { ProposalDialog } from "./ProposalDialog";

export function InboxPage() {
  const { data: items = [], isLoading } = useInbox();
  const { data: notes = [] } = useNotes();
  const acceptAll = useAcceptNote();
  const nav = useNav();
  const [editing, setEditing] = useState<Item | null>(null);
  const groups = groupByNote(items);

  return (
    <>
      <PageHeader
        title="Inbox"
        sub={
          items.length
            ? `${items.length} suggestion${items.length === 1 ? "" : "s"} waiting. Nothing lands on your board until you say so.`
            : "Suggestions from your notes wait here for a yes or no."
        }
      />
      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {!isLoading && items.length === 0 && (
          <div className="mx-auto mt-10 max-w-md rounded-xl border-2 border-edge bg-card shadow-brutal">
            <Empty title="Inbox zero">
              <p>Write a note in Capture and let the AI sort it. Its suggestions show up here.</p>
              <Button className="mt-4" onClick={() => nav("capture")}>
                <NotebookPen /> Go to Capture
              </Button>
            </Empty>
          </div>
        )}
        <div className="mx-auto grid max-w-3xl gap-8">
          {groups.map((g) => {
            const note = notes.find((n) => n.id === g.noteId);
            return (
              <section key={g.noteId ?? "none"}>
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      From {note ? formatDistanceToNowStrict(parseISO(note.createdAt), { addSuffix: true }) : "a note"}
                    </p>
                    <h2 className="truncate font-heading text-lg">{note ? noteTitle(note.body) : "Other"}</h2>
                  </div>
                  {g.noteId && g.items.length > 1 && (
                    <Button
                      variant="outline"
                      className="shrink-0 border-2 border-edge shadow-brutal-sm"
                      disabled={acceptAll.isPending}
                      onClick={() =>
                        acceptAll.mutate(g.noteId!, {
                          onSuccess: (r) => toast.success(`${r.length} items added to your board and calendar`),
                        })
                      }
                    >
                      <CheckCheck /> Accept all {g.items.length}
                    </Button>
                  )}
                </div>
                <div className="grid gap-3">
                  {g.items.map((i) => (
                    <ProposalCard key={i.id} item={i} onEdit={() => setEditing(i)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <ProposalDialog item={editing} onClose={() => setEditing(null)} />
    </>
  );
}
