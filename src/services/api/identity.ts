import type { Conversation, Message, User } from "@/services/types";

let actualMeId = "";
const users = new Map<string, User>();
const apiToUiIds = new Map<string, string>();
const uiToApiIds = new Map<string, string>();

function uiIdForApiId(id: string) {
  if (id === actualMeId) return "u_me";
  // `u_me` is also the legacy database id of Toscani. When another user is
  // signed in, keep that remote user distinct from the local `u_me` alias.
  if (id === "u_me") {
    const alias = "api_u_me";
    apiToUiIds.set(id, alias);
    uiToApiIds.set(alias, id);
    return alias;
  }
  return id;
}

export function rememberMe(user: User): User {
  users.clear();
  apiToUiIds.clear();
  uiToApiIds.clear();
  actualMeId = user.id;
  const normalized = { ...user, id: "u_me" };
  users.set("u_me", normalized);
  apiToUiIds.set(user.id, "u_me");
  uiToApiIds.set("u_me", user.id);
  return normalized;
}
export function rememberUsers(items: User[]) {
  const normalized = items.map((u) => ({ ...u, id: uiIdForApiId(u.id) }));
  normalized.forEach((u) => users.set(u.id, u));
  return normalized;
}
export function cachedUser(id: string) {
  return users.get(id);
}
export function fromApiId(id: string) {
  return uiIdForApiId(id);
}
export function toApiId(id: string) {
  return id === "u_me" ? actualMeId : (uiToApiIds.get(id) ?? id);
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
