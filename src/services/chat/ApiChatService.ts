import type {
  Attachment,
  ChatService,
  Conversation,
  ConversationKind,
  ID,
  Message,
  Paged,
  SearchHit,
} from "@/services/types";
import { api, json, websocketUrl } from "@/services/api/client";
import {
  normalizeConversation,
  normalizeMessage,
  rememberUsers,
  toApiId,
} from "@/services/api/identity";
import type { User } from "@/services/types";

export class ApiChatService implements ChatService {
  private listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private reconnect?: number;
  private emit = () => this.listeners.forEach((listener) => listener());
  private connect() {
    if (this.socket || this.listeners.size === 0) return;
    this.socket = new WebSocket(websocketUrl());
    this.socket.onmessage = this.emit;
    this.socket.onclose = () => {
      this.socket = null;
      if (this.listeners.size) this.reconnect = window.setTimeout(() => this.connect(), 1500);
    };
    this.socket.onerror = () => this.socket?.close();
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        clearTimeout(this.reconnect);
        this.socket?.close();
        this.socket = null;
      }
    };
  }
  async listConversations() {
    const items = (await api<Conversation[]>("/conversations/")).map(normalizeConversation);
    const ids = [...new Set(items.flatMap((c) => c.memberIds).filter((id) => id !== "u_me"))];
    const users = await Promise.all(
      ids.map((id) => api<User>(`/users/${toApiId(id)}/`).catch(() => null)),
    );
    rememberUsers(users.filter((user): user is User => user !== null));
    return items;
  }
  async getConversation(id: ID) {
    try {
      return normalizeConversation(await api<Conversation>(`/conversations/${id}/`));
    } catch {
      return null;
    }
  }
  async getMessages(id: ID, opts?: { before?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.before) params.set("before", opts.before);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const page = await api<Paged<Message>>(`/conversations/${id}/messages/?${params}`);
    return { ...page, items: page.items.map(normalizeMessage) };
  }
  private async persistAttachments(items: Attachment[] = []) {
    return Promise.all(
      items.map(async (item) => {
        if (!item.url.startsWith("blob:")) return item;
        const blob = await fetch(item.url).then((r) => r.blob());
        const form = new FormData();
        form.append("file", blob, item.name);
        return api<Attachment>("/attachments/", { method: "POST", body: form });
      }),
    );
  }
  async sendMessage(input: {
    conversationId: ID;
    body: string;
    replyToId?: ID;
    attachments?: Attachment[];
    clientId: string;
  }) {
    const attachments = await this.persistAttachments(input.attachments);
    const result = normalizeMessage(
      await api<Message>(
        `/conversations/${input.conversationId}/messages/`,
        json("POST", {
          body: input.body,
          replyToId: input.replyToId,
          clientId: input.clientId,
          attachmentIds: attachments.map((a) => a.id),
        }),
      ),
    );
    this.emit();
    return result;
  }
  async editMessage(id: ID, body: string) {
    const result = normalizeMessage(
      await api<Message>(`/messages/${id}/`, json("PATCH", { body })),
    );
    this.emit();
    return result;
  }
  async deleteMessage(id: ID) {
    await api(`/messages/${id}/`, json("DELETE"));
    this.emit();
  }
  async react(id: ID, emoji: string) {
    const result = normalizeMessage(
      await api<Message>(`/messages/${id}/react/`, json("POST", { emoji })),
    );
    this.emit();
    return result;
  }
  async setTyping(id: ID, isTyping: boolean) {
    await api(`/conversations/${id}/typing/`, json("POST", { isTyping }));
  }
  async markRead(id: ID) {
    await api(`/conversations/${id}/read/`, json("POST"));
    this.emit();
  }
  private async patchConversation(id: ID, patch: unknown) {
    const result = normalizeConversation(
      await api<Conversation>(`/conversations/${id}/`, json("PATCH", patch)),
    );
    this.emit();
    return result;
  }
  pinConversation(id: ID, pinned: boolean) {
    return this.patchConversation(id, { pinned });
  }
  muteConversation(id: ID, muted: boolean) {
    return this.patchConversation(id, { muted });
  }
  archiveConversation(id: ID, archived: boolean) {
    return this.patchConversation(id, { archived });
  }
  async createConversation(input: {
    memberIds: ID[];
    kind: ConversationKind;
    name?: string;
    avatarUrl?: string;
  }) {
    const result = normalizeConversation(
      await api<Conversation>(
        "/conversations/",
        json("POST", {
          ...input,
          memberIds: input.memberIds.filter((id) => id !== "u_me").map(toApiId),
        }),
      ),
    );
    this.emit();
    return result;
  }
  async forwardMessage(input: { messageId: ID; conversationIds: ID[] }) {
    await api(
      `/messages/${input.messageId}/forward/`,
      json("POST", { conversationIds: input.conversationIds }),
    );
    this.emit();
  }
  async searchMessages(query: string) {
    const hits = await api<SearchHit[]>(`/search/messages/?q=${encodeURIComponent(query)}`);
    return hits.map((h) => ({ ...h, message: normalizeMessage(h.message) }));
  }
  updateConversation(id: ID, patch: { name?: string; description?: string; avatarUrl?: string }) {
    return this.patchConversation(id, patch);
  }
  async addMembers(id: ID, memberIds: ID[]) {
    const result = normalizeConversation(
      await api<Conversation>(
        `/conversations/${id}/members/`,
        json("POST", { memberIds: memberIds.map(toApiId) }),
      ),
    );
    this.emit();
    return result;
  }
  async removeMember(id: ID, userId: ID) {
    const result = normalizeConversation(
      await api<Conversation>(`/conversations/${id}/members/${toApiId(userId)}/`, json("DELETE")),
    );
    this.emit();
    return result;
  }
  async promoteAdmin(id: ID, userId: ID) {
    const result = normalizeConversation(
      await api<Conversation>(`/conversations/${id}/admins/${toApiId(userId)}/`, json("POST")),
    );
    this.emit();
    return result;
  }
  async demoteAdmin(id: ID, userId: ID) {
    const result = normalizeConversation(
      await api<Conversation>(`/conversations/${id}/admins/${toApiId(userId)}/`, json("DELETE")),
    );
    this.emit();
    return result;
  }
  async leaveConversation(id: ID) {
    await api(`/conversations/${id}/leave/`, json("POST"));
    this.emit();
  }
  async deleteConversation(id: ID) {
    await api(`/conversations/${id}/`, json("DELETE"));
    this.emit();
  }
  getSharedAttachments(id: ID) {
    return api<Attachment[]>(`/conversations/${id}/attachments/`);
  }
}
