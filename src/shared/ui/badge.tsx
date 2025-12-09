import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        default: "bg-muted text-muted-foreground",
        task: "bg-task/12 text-task",
        event: "bg-event/12 text-event",
        deep: "bg-deep/12 text-deep",
        done: "bg-done/15 text-done",
        warn: "bg-doing/25 text-foreground",
        danger: "bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge };
