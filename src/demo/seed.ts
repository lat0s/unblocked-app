import { addDays, startOfWeek } from "date-fns";

import type { Strategy, Subtask, Task } from "@/features/board/api";
import type { CalEvent } from "@/features/calendar/api";
import type { Note } from "@/features/capture/api";
import type { Item, Proposal } from "@/features/inbox/api";
import { isoDate } from "@/shared/format";

export type DemoState = { tasks: Task[]; events: CalEvent[]; notes: Note[]; inbox: Item[]; kv: Record<string, string> };

const s = (method: string, principle: string, explanation: string): Strategy => ({ method, principle, explanation });
const steps = (...titles: string[]): Subtask[] => titles.map((title) => ({ title, done: false }));

/** Sample data with dates relative to today, so the demo never looks stale. */
export function seed(now = new Date()): DemoState {
  const day = (n: number) => isoDate(addDays(now, n));
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const wk = (n: number) => isoDate(addDays(monday, n));
  const stamp = (n: number, h = 9) => {
    const d = addDays(now, n);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };

  let pos = 0;
  const task = (t: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
    notes: null,
    status: "todo",
    position: pos++,
    priority: "medium",
    workType: "shallow",
    energy: "medium",
    estimateMin: null,
    context: null,
    dueDate: null,
    nextAction: null,
    subtasks: [],
    strategies: [],
    confidence: 0.9,
    sourceNote: null,
    createdAt: stamp(-4),
    updatedAt: stamp(-2),
    completedAt: null,
    ...t,
  });

  const tasks = [
    task({
      id: "t1",
      title: "Write the related work section",
      status: "doing",
      priority: "high",
      workType: "deep",
      energy: "high",
      estimateMin: 120,
      context: "@laptop",
      dueDate: day(3),
      nextAction: "Reread the three survey papers and list their gaps",
      subtasks: [{ title: "Summarize each survey", done: true }, ...steps("Group by approach", "Draft 2 paragraphs")],
      strategies: [s("deep_work", "Time blocking", "Two quiet hours with the phone in another room.")],
    }),
    task({
      id: "t2",
      title: "Fix the bike tyre",
      status: "doing",
      priority: "low",
      estimateMin: 30,
      context: "@home",
      nextAction: "Find the repair kit in the garage",
      strategies: [s("atomic_habits", "Make it easy", "Put the kit next to the bike tonight.")],
    }),
    task({
      id: "t3",
      title: "Pay the electricity bill",
      priority: "urgent",
      energy: "low",
      estimateMin: 10,
      context: "@phone",
      dueDate: day(-1),
      nextAction: "Open the bank app and scan the invoice",
      strategies: [s("gtd", "Two-minute rule", "It takes less time than tracking it.")],
    }),
    task({
      id: "t4",
      title: "Email supervisor about the deadline",
      priority: "high",
      estimateMin: 15,
      context: "@email",
      dueDate: day(0),
      nextAction: "Ask if Friday is still fine for the draft",
    }),
    task({
      id: "t5",
      title: "Plan the group presentation",
      workType: "deep",
      energy: "high",
      estimateMin: 60,
      context: "@laptop",
      dueDate: day(5),
      nextAction: "Write down the 5 slides we need",
      subtasks: steps("Agree on the story", "Split slides"),
      strategies: [s("personal_kanban", "Visualize the work", "Put each slide on the board as its own card.")],
    }),
    task({
      id: "t6",
      title: "Book a haircut",
      priority: "low",
      energy: "low",
      estimateMin: 5,
      context: "@phone",
      nextAction: "Call the place on the corner",
    }),
    task({
      id: "t7",
      title: "Return library books",
      energy: "low",
      estimateMin: 20,
      context: "@errands",
      dueDate: day(2),
      strategies: [s("adhd", "External cues", "Put the books by the door.")],
    }),
    task({
      id: "t8",
      title: "Set up the survey form",
      status: "done",
      priority: "high",
      workType: "deep",
      estimateMin: 45,
      context: "@laptop",
      completedAt: stamp(-2, 15),
    }),
    task({ id: "t9", title: "Buy groceries", status: "done", estimateMin: 40, context: "@errands", completedAt: stamp(-1, 17) }),
  ];

  const ev = (
    id: string,
    title: string,
    kind: CalEvent["kind"],
    date: string,
    startTime: string | null,
    endTime: string | null,
    deepWork = false,
  ): CalEvent => ({
    id,
    title,
    notes: null,
    kind,
    date,
    startTime,
    endTime,
    deepWork,
    strategies: [],
    confidence: null,
    sourceNote: null,
  });
  const events = [
    ev("e1", "Lecture: HCI methods", "meeting", wk(0), "10:00", "12:00"),
    ev("e2", "Deep work: survey analysis", "time_block", wk(0), "13:30", "15:30", true),
    ev("e3", "Supervisor meeting", "meeting", wk(1), "09:00", "09:45"),
    ev("e4", "Gym", "time_block", wk(1), "17:30", "18:30"),
    ev("e5", "Deep work: related work", "time_block", wk(2), "08:30", "11:00", true),
    ev("e6", "Group sync", "meeting", wk(2), "14:00", "15:00"),
    ev("e7", "Lecture: Evaluation", "meeting", wk(3), "13:00", "15:00"),
    ev("e8", "Weekly review", "time_block", wk(4), "16:00", "17:00"),
    ev("e9", "Mom's birthday", "reminder", wk(5), null, null),
    ev("e10", "Call with Anna", "meeting", wk(6), "18:00", "18:30"),
    ev("e11", "Deep work: write the draft", "time_block", day(0), "09:00", "11:00", true),
  ];

  const body =
    "need to finish the user study report before the deadline, feels huge and i keep avoiding it\ndentist moved to tuesday 10am\ncall grandma this weekend\ngym more often??\nreply to the landlord about the broken heater";
  const p = (x: Partial<Proposal> & Pick<Proposal, "kind" | "title">): Proposal => ({
    notes: null,
    priority: "medium",
    workType: "shallow",
    energy: "medium",
    estimateMin: null,
    context: null,
    dueDate: null,
    nextAction: null,
    subtasks: [],
    eventKind: null,
    date: null,
    startTime: null,
    endTime: null,
    deepWork: false,
    strategies: [],
    confidence: 0.9,
    ...x,
  });
  const proposals = [
    p({
      kind: "task",
      title: "Finish the user study report",
      notes: "It feels huge, so it starts with an outline instead of the whole thing.",
      priority: "high",
      workType: "deep",
      energy: "high",
      estimateMin: 180,
      context: "@computer",
      dueDate: day(4),
      nextAction: "Open the report and write the section headings",
      subtasks: steps(
        "Write the outline",
        "Draft intro and method",
        "Draft the findings",
        "Draft discussion and conclusion",
        "Read it through once",
      ),
      deepWork: true,
      strategies: [
        s("gtd", "Next action", "An avoided task gets a concrete first step that takes minutes, not hours."),
        s("adhd", "Break it down", "Five small steps are easier to start than one big report."),
      ],
    }),
    p({
      kind: "event",
      title: "Dentist",
      priority: "high",
      context: "@errands",
      eventKind: "meeting",
      date: isoDate(addDays(monday, 8)),
      startTime: "10:00",
      endTime: "11:00",
      strategies: [s("gtd", "Hard landscape", "A fixed time belongs on the calendar, not on a list.")],
    }),
    p({
      kind: "task",
      title: "Call grandma",
      energy: "low",
      estimateMin: 15,
      context: "@phone",
      dueDate: wk(5),
      nextAction: "Pick a time and dial",
      strategies: [s("gtd", "Contexts", "Batch it with your other @phone tasks.")],
    }),
    p({
      kind: "task",
      title: "Pack the gym bag",
      priority: "low",
      estimateMin: 10,
      context: "@home",
      nextAction: "Put the bag by the door tonight",
      strategies: [s("atomic_habits", "Make it obvious", "A packed bag by the door makes going the default.")],
      confidence: 0.7,
    }),
    p({
      kind: "task",
      title: "Reply to the landlord about the heater",
      energy: "low",
      estimateMin: 10,
      context: "@email",
      dueDate: day(1),
      nextAction: "Write two lines: what is broken and since when",
      strategies: [s("gtd", "Two-minute rule", "Short enough to do as soon as you sit down.")],
    }),
  ];
  const created = stamp(0, 8);
  const inbox: Item[] = proposals.map((proposal, i) => ({ id: `i${i + 1}`, noteId: "n1", proposal, createdAt: created }));

  const notes: Note[] = [
    { id: "n1", body, createdAt: created, updatedAt: created, processedAt: created, itemCount: proposals.length },
    {
      id: "n2",
      body: "plan the group presentation\n\tslides: intro, method, results, demo, wrap-up\nask Anna about the demo video\nrenew the gym card before friday",
      createdAt: stamp(-1, 20),
      updatedAt: stamp(-1, 20),
      processedAt: null,
      itemCount: 0,
    },
  ];

  return { tasks, events, notes, inbox, kv: {} };
}
