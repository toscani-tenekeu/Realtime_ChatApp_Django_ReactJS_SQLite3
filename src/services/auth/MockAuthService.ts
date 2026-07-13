import type { AuthService, Session, User } from "@/services/types";
import { seedUsers } from "@/mocks/seed";

const STORAGE_KEY = "pulse_session_v1";

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockAuthService implements AuthService {
  private current: Session | null;

  constructor() {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.current = raw ? (JSON.parse(raw) as Session) : null;
    } else {
      this.current = null;
    }
  }

  private persist(s: Session | null) {
    this.current = s;
    if (typeof window === "undefined") return;
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  async getCurrentUser() {
    await delay(50);
    return this.current?.user ?? null;
  }

  async signIn({ identifier, password }: { identifier: string; password: string; remember: boolean }) {
    await delay();
    if (!identifier || !password) throw new Error("Enter your credentials.");
    if (password.length < 4) throw new Error("Incorrect email or password.");
    const me: User = { ...seedUsers[0], displayName: seedUsers[0].displayName };
    const session: Session = { user: me, token: "mock-token" };
    this.persist(session);
    return session;
  }

  async signUp(input: { displayName: string; username: string; email: string; password: string }) {
    await delay();
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
    const me: User = {
      ...seedUsers[0],
      displayName: input.displayName,
      username: input.username,
      email: input.email,
    };
    const session: Session = { user: me, token: "mock-token" };
    this.persist(session);
    return session;
  }

  async signOut() {
    await delay(100);
    this.persist(null);
  }

  async requestPasswordReset(email: string) {
    await delay();
    if (!email.includes("@")) throw new Error("Enter a valid email address.");
  }

  async resetPassword({ password }: { token: string; password: string }) {
    await delay();
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  }
}
