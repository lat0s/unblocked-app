import { CalendarDays, KanbanSquare, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import { BoardPage } from "@/features/board/BoardPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";

import type { PageId } from "./nav";

export type PageDef = { id: PageId; label: string; icon: LucideIcon; Component: ComponentType; bottom?: boolean };

/** Every page, in sidebar order. Each lives in its own feature folder. */
export const PAGES: PageDef[] = [
  { id: "board", label: "Board", icon: KanbanSquare, Component: BoardPage },
  { id: "calendar", label: "Calendar", icon: CalendarDays, Component: CalendarPage },
];
