import type { ReactNode } from "react";

/** Big heading, one line of context, actions on the right. */
export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-7 pb-5">
      <div className="min-w-0">
        <h1 className="font-heading text-[28px] leading-none tracking-tight">{title}</h1>
        {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
