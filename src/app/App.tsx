import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { Empty } from "@/shared/components/Empty";
import { queryClient } from "@/shared/query";

import { ErrorBoundary } from "./ErrorBoundary";
import { NavContext, type PageId } from "./nav";
import { PAGES } from "./pages";
import { Sidebar } from "./Sidebar";
import { useBadges } from "./useBadges";

function Shell() {
  const [pageId, setPageId] = useState<PageId>("today");
  const badges = useBadges();
  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];

  return (
    <NavContext value={setPageId}>
      <div className="flex h-full overflow-hidden">
        <Sidebar pages={PAGES} active={page?.id ?? pageId} onSelect={setPageId} badges={badges} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {page ? (
            <ErrorBoundary key={page.id} scope={page.id}>
              <page.Component />
            </ErrorBoundary>
          ) : (
            <Empty title="Nothing here yet" />
          )}
        </main>
      </div>
    </NavContext>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
      <Toaster position="bottom-right" toastOptions={{ className: "!border-2 !border-edge !shadow-brutal-sm !font-sans" }} />
    </QueryClientProvider>
  );
}
