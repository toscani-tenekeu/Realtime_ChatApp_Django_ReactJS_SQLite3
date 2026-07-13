import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services";
import type { User } from "@/services/types";

interface Ctx {
  user: User | null;
  loading: boolean;
  signIn: (input: { identifier: string; password: string; remember: boolean }) => Promise<void>;
  signUp: (input: { displayName: string; username: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        async signIn(input) {
          const s = await authService.signIn(input);
          setUser(s.user);
        },
        async signUp(input) {
          const s = await authService.signUp(input);
          setUser(s.user);
        },
        async signOut() {
          await authService.signOut();
          setUser(null);
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
