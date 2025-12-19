import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";

import { Empty } from "@/shared/components/Empty";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";

import { noteTitle, useDeleteNote, useNotes, type Note } from "./api";

type Props = { activeId: string; onOpen: (n: Note) => void; onDeleted: (id: string) => void };

export function NoteHistory({ activeId, onOpen, onDeleted }: Props) {
  const { data: notes = [] } = useNotes();
  const del = useDeleteNote();
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border-2 border-edge bg-card shadow-brutal">
      <h2 className="border-b-2 border-edge px-4 py-3 font-heading text-sm tracking-wide uppercase">Earlier notes</h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {notes.length === 0 && (
          <Empty small title="No notes yet">
            Everything you write is kept here.
          </Empty>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className={cn(
              "group relative rounded-lg border-2 border-transparent",
              n.id === activeId ? "border-edge bg-secondary" : "hover:bg-muted",
            )}
          >
            <button onClick={() => onOpen(n)} className="w-full px-3 py-2.5 pr-9 text-left">
              <p className="truncate text-sm font-semibold">{noteTitle(n.body, 48)}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNowStrict(parseISO(n.updatedAt), { addSuffix: true })}</span>
                {n.processedAt ? (
                  <Badge tone="done">
                    {n.itemCount} item{n.itemCount === 1 ? "" : "s"}
                  </Badge>
                ) : (
                  <Badge>draft</Badge>
                )}
              </div>
            </button>
            <button
              aria-label="Delete note"
              onClick={() => del.mutate(n.id, { onSuccess: () => onDeleted(n.id) })}
              className="absolute top-2.5 right-2 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
