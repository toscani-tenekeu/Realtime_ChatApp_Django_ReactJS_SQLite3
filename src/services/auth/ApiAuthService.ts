import type { AuthService, Session, User, UserSettings } from "@/services/types";
import { api, json, tokenStore } from "@/services/api/client";
import { rememberMe, rememberUsers, toApiId } from "@/services/api/identity";

export class ApiAuthService implements AuthService {
  async getCurrentUser() {
    if (!tokenStore.get()) return null;
    try {
      return rememberMe(await api<User>("/auth/me/"));
    } catch {
      return null;
    }
  }
  async signIn(input: { identifier: string; password: string; remember: boolean }) {
    const session = await api<Session>("/auth/login/", json("POST", input));
    tokenStore.set(session.token);
    return { ...session, user: rememberMe(session.user) };
  }
  async signUp(input: { displayName: string; username: string; email: string; password: string }) {
    const session = await api<Session>("/auth/register/", json("POST", input));
    tokenStore.set(session.token);
    return { ...session, user: rememberMe(session.user) };
  }
  async signOut() {
    try {
      await api<void>("/auth/logout/", json("POST"));
    } finally {
      tokenStore.set(null);
    }
  }
  async requestPasswordReset(email: string) {
    await api("/auth/password/reset-request/", json("POST", { email }));
  }
  async resetPassword(input: { token: string; password: string }) {
    await api("/auth/password/reset-confirm/", json("POST", input));
  }
  async updateProfile(
    patch: Partial<Pick<User, "displayName" | "username" | "bio" | "avatarUrl">>,
  ) {
    return rememberMe(await api<User>("/auth/me/", json("PATCH", patch)));
  }
  async changePassword(input: { current: string; next: string }) {
    await api("/auth/password/change/", json("POST", input));
  }
  async deleteAccount(password: string) {
    await api("/auth/me/", json("DELETE", { password }));
    tokenStore.set(null);
  }
  getSettings() {
    return api<UserSettings>("/settings/");
  }
  updateSettings(patch: Partial<UserSettings>) {
    return api<UserSettings>("/settings/", json("PATCH", patch));
  }
  async getBlockedUsers() {
    return rememberUsers(await api<User[]>("/blocked/"));
  }
  async blockUser(id: string) {
    await api(`/blocked/${toApiId(id)}/`, json("POST"));
  }
  async unblockUser(id: string) {
    await api(`/blocked/${toApiId(id)}/`, json("DELETE"));
  }
}
