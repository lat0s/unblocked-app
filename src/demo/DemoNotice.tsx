import { ExternalLink, RotateCcw } from "lucide-react";

import { queryClient } from "@/shared/query";
import { DEMO_AI_MESSAGE, REPO_URL } from "@/shared/runtime";
import { Button, buttonVariants } from "@/shared/ui/button";

async function reset() {
  const { resetDemo } = await import("./backend");
  resetDemo();
  await queryClient.invalidateQueries();
}

/** Sidebar tag that says this is the web demo. */
export function DemoTag() {
  return (
    <div className="mb-2 grid gap-1.5 rounded-lg border-2 border-edge bg-muted p-2.5 text-xs">
      <span className="font-bold">Web demo</span>
      <span className="text-muted-foreground">Sample data, saved in this browser only. No AI here.</span>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
      >
        Get the app <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

/** Replaces the AI settings in the demo: no key can be entered or stored. */
export function DemoAiCard() {
  return (
    <section className="grid gap-3 rounded-xl border-2 border-edge bg-card p-6 shadow-brutal">
      <h2 className="font-heading text-lg">AI is off in the web demo</h2>
      <p className="text-sm text-muted-foreground">{DEMO_AI_MESSAGE}</p>
      <p className="text-sm text-muted-foreground">
        The desktop app keeps your key in the system keyring and sends only the note you choose to sort.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={buttonVariants()}>
          <ExternalLink /> Clone on GitHub
        </a>
        <Button variant="outline" onClick={reset}>
          <RotateCcw /> Reset sample data
        </Button>
      </div>
    </section>
  );
}
