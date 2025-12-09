import { useEffect, useState } from "react";

import { call } from "./ipc";

export type ThemeChoice = "system" | "light" | "dark";

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Theme choice stored in the app database; "system" follows the desktop. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    call<string | null>("pref_get", { key: "theme" })
      .then((v) => v && setChoice(v as ThemeChoice))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apply(choice);
    if (choice !== "system") return;
    const m = media();
    const onChange = () => apply("system");
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [choice]);

  const set = (c: ThemeChoice) => {
    setChoice(c);
    void call("pref_set", { key: "theme", value: c }).catch(() => {});
  };
  return { choice, set };
}
