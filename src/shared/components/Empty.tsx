import type { ReactNode } from "react";

/** Empty state with the mascot. */
export function Empty({ title, children, small }: { title: string; children?: ReactNode; small?: boolean }) {
  return (
    <div className="grid place-items-center px-6 py-10 text-center">
      <img src="/blob.png" alt="" className={small ? "mb-2 size-12 opacity-80" : "mb-3 size-20"} />
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
