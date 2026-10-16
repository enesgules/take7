import { useEffect, useState } from "react";
export const themes = ["signal", "afterlight", "soft"] as const;
export type Theme = (typeof themes)[number];
const key = "take7.theme";
export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(key, theme);
  } catch {
    /* The live theme still works without storage. */
  }
  window.dispatchEvent(new CustomEvent("take7-theme", { detail: theme }));
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("signal");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      const selected = isTheme(saved) ? saved : "signal";
      document.documentElement.dataset.theme = selected;
      setTheme(selected);
    } catch {
      /* Use the default. */
    }
    const changed = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (isTheme(value)) setTheme(value);
    };
    window.addEventListener("take7-theme", changed);
    return () => window.removeEventListener("take7-theme", changed);
  }, []);
  return [theme, applyTheme] as const;
}
