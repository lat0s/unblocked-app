import { useInbox } from "@/features/inbox/api";

import type { PageId } from "./nav";

/** Counts shown next to sidebar items. Slices add theirs here. */
export function useBadges(): Partial<Record<PageId, number>> {
  const inbox = useInbox().data?.length;
  return { inbox };
}
