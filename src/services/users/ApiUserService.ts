import type { User, UserService } from "@/services/types";
import { api } from "@/services/api/client";
import { cachedUser, rememberUsers, toApiId } from "@/services/api/identity";

export class ApiUserService implements UserService {
  async searchUsers(query: string) {
    return rememberUsers(await api<User[]>(`/users/?q=${encodeURIComponent(query)}`));
  }
  async getUser(id: string) {
    const cached = cachedUser(id);
    if (cached) return cached;
    try {
      const user = await api<User>(`/users/${toApiId(id)}/`);
      rememberUsers([user]);
      return user;
    } catch {
      return null;
    }
  }
}
