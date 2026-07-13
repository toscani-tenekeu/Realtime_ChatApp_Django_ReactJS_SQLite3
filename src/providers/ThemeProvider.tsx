import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";

type Mode = "light" | "dark";

const THEME_KEY = "pulse_theme_v1";

interface Ctx {
  mode: Mode;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  const value = useMemo<Ctx>(
    () => ({ mode, setMode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }),
    [mode],
  );

  return (
    <ThemeCtx.Provider value={value}>
      <FluentProvider theme={mode === "dark" ? webDarkTheme : webLightTheme} style={{ height: "100%" }}>
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
