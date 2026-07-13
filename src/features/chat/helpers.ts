import { seedUsers } from "@/mocks/seed";
import { cachedUser } from "@/services/api/identity";
import type { Conversation, User } from "@/services/types";

export function getUser(id: string): User | undefined {
  return cachedUser(id) ?? seedUsers.find((u) => u.id === id);
}

export function conversationTitle(c: Conversation, meId = "u_me"): string {
  if (c.kind === "group") return c.name ?? "Untitled group";
  const otherId = c.memberIds.find((id) => id !== meId);
  return getUser(otherId ?? "")?.displayName ?? "Unknown";
}

export function conversationSubtitle(c: Conversation, meId = "u_me"): string {
  if (c.kind === "group") return `${c.memberIds.length} members`;
  const otherId = c.memberIds.find((id) => id !== meId);
  const u = getUser(otherId ?? "");
  if (!u) return "";
  if (u.presence === "online") return "Active now";
  if (u.presence === "away") return "Away";
  return u.lastSeen ? `Last seen ${new Date(u.lastSeen).toLocaleString()}` : "Offline";
}

export function conversationAvatar(c: Conversation, meId = "u_me") {
  if (c.kind === "group") return { name: c.name ?? "Group", image: c.avatarUrl };
  const other = getUser(c.memberIds.find((id) => id !== meId) ?? "");
  return { name: other?.displayName ?? "?", image: other?.avatarUrl, presence: other?.presence };
}
