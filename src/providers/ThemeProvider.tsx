import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";

export type ThemePref = "light" | "dark" | "system";
type Mode = "light" | "dark";

const THEME_KEY = "realtime_chatapp_theme_v1";

interface Ctx {
  mode: Mode;
  pref: ThemePref;
  toggle: () => void;
  setPref: (m: ThemePref) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

function resolve(pref: ThemePref): Mode {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  });
  const [mode, setMode] = useState<Mode>(() => resolve(pref));

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, pref);
    setMode(resolve(pref));
    if (pref !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const listener = () => setMode(resolve("system"));
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, [pref]);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      pref,
      setPref: setPrefState,
      toggle: () => setPrefState(mode === "light" ? "dark" : "light"),
    }),
    [mode, pref],
  );

  return (
    <ThemeCtx.Provider value={value}>
      <FluentProvider
        theme={mode === "dark" ? webDarkTheme : webLightTheme}
        style={{ height: "100%" }}
      >
        {children}
      </FluentProvider>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
