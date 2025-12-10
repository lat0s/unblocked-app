import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Empty } from "@/shared/components/Empty";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

import { applyMove, byColumn, COLUMNS, useMoveTask, useTasks, WIP_LIMIT, type Status, type Task } from "./api";
import { TaskCard } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";

const DOT: Record<Status, string> = { todo: "bg-task", doing: "bg-doing", done: "bg-done" };

export function BoardPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const move = useMoveTask();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ task: Task | null; status: Status } | null>(null);
  const cols = byColumn(tasks);

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const to = r.destination.droppableId as Status;
    if (to === r.source.droppableId && r.destination.index === r.source.index) return;
    qc.setQueryData<Task[]>(["tasks"], (old) => applyMove(old ?? [], r.draggableId, to, r.destination!.index));
    move.mutate({ id: r.draggableId, status: to, index: r.destination.index });
  };

  return (
    <>
      <PageHeader title="Board" sub={`${cols.todo.length} to do · ${cols.doing.length} doing · ${cols.done.length} done`}>
        <Button size="lg" className="border-2 border-edge shadow-brutal-sm" onClick={() => setEditing({ task: null, status: "todo" })}>
          <Plus /> New task
        </Button>
      </PageHeader>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-5 px-8 pb-8">
          {COLUMNS.map((col) => {
            const list = cols[col.id];
            const over = col.id === "doing" && list.length > WIP_LIMIT;
            return (
              <section key={col.id} className="flex min-h-0 flex-col rounded-xl border-2 border-edge bg-muted/60">
                <header className="flex items-center gap-2 border-b-2 border-edge px-4 py-3">
                  <span className={cn("size-2.5 rounded-full", DOT[col.id])} />
                  <h2 className="font-heading text-sm tracking-wide uppercase">{col.label}</h2>
                  <span className="num text-sm text-muted-foreground">{list.length}</span>
                  <span className="flex-1" />
                  {col.id !== "done" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={`Add to ${col.label}`}
                      onClick={() => setEditing({ task: null, status: col.id })}
                    >
                      <Plus />
                    </Button>
                  )}
                </header>
                {over && (
                  <p className="flex items-center gap-1.5 bg-doing/30 px-4 py-1.5 text-xs font-medium">
                    <TriangleAlert className="size-3.5" /> More than {WIP_LIMIT} in progress. Finish one before pulling more.
                  </p>
                )}
                <Droppable droppableId={col.id}>
                  {(drop, snap) => (
                    <div
                      ref={drop.innerRef}
                      {...drop.droppableProps}
                      className={cn(
                        "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 transition-colors",
                        snap.isDraggingOver && "bg-secondary/70",
                      )}
                    >
                      {list.map((t, i) => (
                        <Draggable key={t.id} draggableId={t.id} index={i}>
                          {(drag, ds) => (
                            <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
                              <TaskCard task={t} dragging={ds.isDragging} onOpen={() => setEditing({ task: t, status: t.status })} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {drop.placeholder}
                      {!isLoading && list.length === 0 && !snap.isDraggingOver && (
                        <Empty small title={col.id === "todo" ? "Nothing to do" : "Empty"}>
                          {col.hint}
                        </Empty>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>
      <TaskDialog open={!!editing} task={editing?.task} status={editing?.status} onClose={() => setEditing(null)} />
    </>
  );
}
