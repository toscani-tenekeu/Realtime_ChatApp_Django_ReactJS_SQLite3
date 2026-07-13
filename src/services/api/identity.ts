import type { Conversation, Message, User } from "@/services/types";

let actualMeId = "";
const users = new Map<string, User>();

export function rememberMe(user: User): User {
  actualMeId = user.id;
  const normalized = { ...user, id: "u_me" };
  users.set("u_me", normalized);
  return normalized;
}
export function rememberUsers(items: User[]) {
  items.forEach((u) => users.set(u.id, u));
  return items;
}
export function cachedUser(id: string) {
  return users.get(id);
}
export function fromApiId(id: string) {
  return id === actualMeId ? "u_me" : id;
}
export function toApiId(id: string) {
  return id === "u_me" ? actualMeId : id;
}
export function normalizeMessage(message: Message): Message {
  return {
    ...message,
    authorId: fromApiId(message.authorId),
    mentions: message.mentions?.map(fromApiId),
    reactions: message.reactions.map((r) => ({ ...r, userIds: r.userIds.map(fromApiId) })),
  };
}
export function normalizeConversation(c: Conversation): Conversation {
  return {
    ...c,
    memberIds: c.memberIds.map(fromApiId),
    adminIds: c.adminIds.map(fromApiId),
    typingUserIds: c.typingUserIds.map(fromApiId),
    lastMessage: c.lastMessage ? normalizeMessage(c.lastMessage) : undefined,
  };
}
