import { CalendarDays, Inbox, KanbanSquare, NotebookPen, Settings, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import { BoardPage } from "@/features/board/BoardPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";
import { CapturePage } from "@/features/capture/CapturePage";
import { InboxPage } from "@/features/inbox/InboxPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

import type { PageId } from "./nav";

export type PageDef = { id: PageId; label: string; icon: LucideIcon; Component: ComponentType; bottom?: boolean };

/** Every page, in sidebar order. Each lives in its own feature folder. */
export const PAGES: PageDef[] = [
  { id: "capture", label: "Capture", icon: NotebookPen, Component: CapturePage },
  { id: "inbox", label: "Inbox", icon: Inbox, Component: InboxPage },
  { id: "board", label: "Board", icon: KanbanSquare, Component: BoardPage },
  { id: "calendar", label: "Calendar", icon: CalendarDays, Component: CalendarPage },
  { id: "settings", label: "Settings", icon: Settings, Component: SettingsPage, bottom: true },
];
