import { cn } from "cn";
import type * as React from "react";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border-2 border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-edge disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-none rounded-md border-2 border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-edge disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-xs font-semibold tracking-wide text-muted-foreground uppercase", className)} {...props} />;
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn("h-9 w-full rounded-md border-2 border-input bg-card px-2 text-sm outline-none focus-visible:border-edge", className)}
      {...props}
    />
  );
}

export { Input, Label, Select, Textarea };
