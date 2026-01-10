/** Short labels for the planning methods the AI cites. */
const METHODS: Record<string, string> = {
  gtd: "GTD",
  deep_work: "Deep work",
  atomic_habits: "Habits",
  adhd: "ADHD-friendly",
  personal_kanban: "Kanban",
};

export const methodName = (id: string) => METHODS[id] ?? id.replaceAll("_", " ");
export const principleName = (p: string) => p.replaceAll("_", " ").toLowerCase();
