import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Status = "online" | "offline" | "reconnecting";

const ConnCtx = createContext<{ status: Status } | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
  );

  useEffect(() => {
    const goOffline = () => setStatus("offline");
    const goOnline = () => {
      setStatus("reconnecting");
      window.setTimeout(() => setStatus("online"), 900);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return <ConnCtx.Provider value={{ status }}>{children}</ConnCtx.Provider>;
}

export function useConnection() {
  const c = useContext(ConnCtx);
  if (!c) throw new Error("useConnection must be used within ConnectionProvider");
  return c;
}
