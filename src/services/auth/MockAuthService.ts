import type { AuthService, Session, User, UserSettings } from "@/services/types";
import { seedUsers } from "@/mocks/seed";

const STORAGE_KEY = "pulse_session_v1";
const SETTINGS_KEY = "pulse_settings_v1";
const BLOCKED_KEY = "pulse_blocked_v1";

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  browserNotifications: false,
  soundEnabled: true,
  enterToSend: true,
  showReadReceipts: true,
  showPresence: true,
};

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockAuthService implements AuthService {
  private current: Session | null;
  private settings: UserSettings;
  private blocked: Set<string>;

  constructor() {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.current = raw ? (JSON.parse(raw) as Session) : null;
      const sraw = window.localStorage.getItem(SETTINGS_KEY);
      this.settings = sraw ? { ...DEFAULT_SETTINGS, ...JSON.parse(sraw) } : { ...DEFAULT_SETTINGS };
      const braw = window.localStorage.getItem(BLOCKED_KEY);
      this.blocked = new Set(braw ? (JSON.parse(braw) as string[]) : []);
    } else {
      this.current = null;
      this.settings = { ...DEFAULT_SETTINGS };
      this.blocked = new Set();
    }
  }

  private persist(s: Session | null) {
    this.current = s;
    if (typeof window === "undefined") return;
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  private persistSettings() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    }
  }

  private persistBlocked() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BLOCKED_KEY, JSON.stringify([...this.blocked]));
    }
  }

  async getCurrentUser() {
    await delay(50);
    return this.current?.user ?? null;
  }

  async signIn({ identifier, password }: { identifier: string; password: string; remember: boolean }) {
    await delay();
    if (!identifier || !password) throw new Error("Enter your credentials.");
    if (password.length < 4) throw new Error("Incorrect email or password.");
    const me: User = { ...seedUsers[0] };
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

  async updateProfile(patch: Partial<Pick<User, "displayName" | "username" | "bio" | "avatarUrl">>) {
    await delay(200);
    if (!this.current) throw new Error("Not signed in.");
    if (patch.username !== undefined && !/^[a-z0-9_.]{3,20}$/i.test(patch.username)) {
      throw new Error("Username must be 3–20 letters, numbers, dot or underscore.");
    }
    if (patch.displayName !== undefined && patch.displayName.trim().length < 2) {
      throw new Error("Display name must be at least 2 characters.");
    }
    this.current.user = { ...this.current.user, ...patch };
    this.persist(this.current);
    return this.current.user;
  }

  async changePassword({ current, next }: { current: string; next: string }) {
    await delay();
    if (current.length < 4) throw new Error("Current password is incorrect.");
    if (next.length < 8) throw new Error("New password must be at least 8 characters.");
  }

  async deleteAccount(password: string) {
    await delay();
    if (password.length < 4) throw new Error("Password is incorrect.");
    this.persist(null);
  }

  async getSettings() {
    await delay(40);
    return { ...this.settings };
  }

  async updateSettings(patch: Partial<UserSettings>) {
    await delay(100);
    this.settings = { ...this.settings, ...patch };
    this.persistSettings();
    return { ...this.settings };
  }

  async getBlockedUsers() {
    await delay(60);
    return seedUsers.filter((u) => this.blocked.has(u.id));
  }

  async blockUser(id: string) {
    await delay(100);
    this.blocked.add(id);
    this.persistBlocked();
  }

  async unblockUser(id: string) {
    await delay(100);
    this.blocked.delete(id);
    this.persistBlocked();
  }
}
