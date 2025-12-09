import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import type { PageId } from "./nav";

export type PageDef = { id: PageId; label: string; icon: LucideIcon; Component: ComponentType; bottom?: boolean };

/** Every page, in sidebar order. Each lives in its own feature folder. */
export const PAGES: PageDef[] = [];
