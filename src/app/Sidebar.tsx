import { Monitor, Moon, Sun } from "lucide-react";

import { DemoTag } from "@/demo/DemoNotice";
import { IN_TAURI } from "@/shared/runtime";
import { useTheme, type ThemeChoice } from "@/shared/theme";
import { cn } from "@/shared/utils";

import type { PageId } from "./nav";
import type { PageDef } from "./pages";

const THEMES: { id: ThemeChoice; icon: typeof Sun; label: string }[] = [
  { id: "light", icon: Sun, label: "Light" },
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "system", icon: Monitor, label: "Follow system" },
];

type Props = { pages: PageDef[]; active: PageId; onSelect: (id: PageId) => void; badges: Partial<Record<PageId, number>> };

export function Sidebar({ pages, active, onSelect, badges }: Props) {
  const theme = useTheme();
  const item = (p: PageDef) => {
    const Icon = p.icon;
    const on = p.id === active;
    const badge = badges[p.id];
    return (
      <button
        key={p.id}
        onClick={() => onSelect(p.id)}
        className={cn(
          "flex h-10 w-full items-center gap-3 rounded-lg border-2 px-3 text-left text-[15px] font-medium transition-all",
          on ? "border-edge bg-primary text-primary-foreground shadow-brutal-sm" : "border-transparent hover:bg-muted",
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="flex-1">{p.label}</span>
        {!!badge && (
          <span
            className={cn("num rounded-full px-1.5 text-xs font-bold", on ? "bg-primary-foreground text-primary" : "bg-event text-white")}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r-2 border-edge bg-card px-3 py-4">
      <div className="mb-5 flex items-center gap-2.5 px-1.5">
        <img src="/blob.png" alt="" className="size-9" />
        <span className="font-heading text-xl tracking-tight">Unblocked</span>
      </div>
      {pages.filter((p) => !p.bottom).map(item)}
      <div className="flex-1" />
      {!IN_TAURI && <DemoTag />}
      {pages.filter((p) => p.bottom).map(item)}
      <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
        {THEMES.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => theme.set(t.id)}
            className={cn(
              "grid h-7 flex-1 place-items-center rounded-md text-muted-foreground transition-colors",
              theme.choice === t.id && "bg-card text-foreground shadow-sm",
            )}
          >
            <t.icon className="size-4" />
          </button>
        ))}
      </div>
    </nav>
  );
}
