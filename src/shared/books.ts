/** Display names for the books the AI cites. */
const BOOKS: Record<string, string> = {
  gtd: "Getting Things Done",
  deep_work: "Deep Work",
  atomic_habits: "Atomic Habits",
  adhd: "ADHD strategies",
  personal_kanban: "Personal Kanban",
};

export const bookName = (id: string) => BOOKS[id] ?? id.replaceAll("_", " ");
export const principleName = (p: string) => p.replaceAll("_", " ");
