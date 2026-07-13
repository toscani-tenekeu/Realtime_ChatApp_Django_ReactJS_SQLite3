import type { UserService } from "@/services/types";
import { seedUsers } from "@/mocks/seed";

export class MockUserService implements UserService {
  async searchUsers(query: string) {
    await new Promise((r) => setTimeout(r, 120));
    const q = query.trim().toLowerCase();
    if (!q) return seedUsers.filter((u) => u.id !== "u_me");
    return seedUsers.filter(
      (u) =>
        u.id !== "u_me" &&
        (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)),
    );
  }

  async getUser(id: string) {
    await new Promise((r) => setTimeout(r, 80));
    return seedUsers.find((u) => u.id === id) ?? null;
  }
}
