import { useMutation, useQueryClient } from "@tanstack/react-query";

import { call } from "@/shared/ipc";

export type QuestionKind = "context" | "item_type" | "due_date" | "due_time" | "context_tag" | "card_count";
export type Option = { label: string; value: string };
export type Question = {
  id: string;
  kind: QuestionKind;
  label: string;
  placeholder: string | null;
  required: boolean;
  refs: string[];
  options: Option[];
  quotes: string[];
};
export type Card = { id: string; title: string; rationale: string; count: number | null };
export type DraftItem = { id: string; kind: "task" | "event"; title: string; summary: string | null; confidence: number; refs: string[] };
export type Draft = { wizard: boolean; items: DraftItem[]; questions: Question[]; cards: Card[]; insights: string[] };
export type Outcome = { count: number; tasks: number; events: number; insights: string[] };
export type Answers = Record<string, string>;

export const useStart = () => useMutation({ mutationFn: (noteId: string) => call<Draft>("refine_start", { noteId }) });

export function useFinish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { noteId: string; answers: Answers; cards: string[] }) =>
      call<Outcome>("refine_finish", {
        noteId: a.noteId,
        answers: Object.entries(a.answers).map(([questionId, value]) => ({ questionId, value })),
        cards: a.cards,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/** Required questions still without an answer. */
export const missing = (qs: Question[], answers: Answers) => qs.filter((q) => q.required && !answers[q.id]?.trim());

/** "line-3" → "Line 3". */
export const refLabel = (ref: string) => ref.replace(/^line-/, "Line ");

export const KIND_HINT: Record<QuestionKind, string> = {
  context: "What is this about?",
  item_type: "Task or event?",
  due_date: "When?",
  due_time: "What time?",
  context_tag: "Where or how?",
  card_count: "How many pieces?",
};
