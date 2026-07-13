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
import { seedConversations, seedMessages } from "@/mocks/seed";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function shouldFailOccasionally() {
  return Math.random() < 0.08;
}

export class MockChatService implements ChatService {
  private conversations: Conversation[] = seedConversations.map((c) => ({ ...c }));
  private messages: Message[] = seedMessages.map((m) => ({ ...m }));
  private listeners = new Set<() => void>();

  private emit() {
    for (const l of this.listeners) l();
  }

  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private mustGet(id: ID): Conversation {
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("Conversation not found");
    return c;
  }

  async listConversations() {
    await delay(120);
    return [...this.conversations].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const ta = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
      const tb = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
      return tb - ta;
    });
  }

  async getConversation(id: ID) {
    await delay(80);
    return this.conversations.find((c) => c.id === id) ?? null;
  }

  async getMessages(conversationId: ID, opts?: { before?: string; limit?: number }) {
    await delay(180);
    const limit = opts?.limit ?? 30;
    let items = this.messages.filter((m) => m.conversationId === conversationId);
    items = items.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (opts?.before) {
      const idx = items.findIndex((m) => m.id === opts.before);
      if (idx > -1) items = items.slice(0, idx);
    }
    const start = Math.max(0, items.length - limit);
    const page = items.slice(start);
    const paged: Paged<Message> = {
      items: page,
      hasMore: start > 0,
      nextCursor: page[0]?.id,
    };
    return paged;
  }

  async sendMessage(input: {
    conversationId: ID;
    body: string;
    replyToId?: ID;
    attachments?: Attachment[];
    clientId: string;
  }) {
    await delay(500);
    if (shouldFailOccasionally()) {
      throw new Error("Could not send message. Check your connection.");
    }
    const msg: Message = {
      id: input.clientId,
      conversationId: input.conversationId,
      authorId: "u_me",
      body: input.body,
      createdAt: new Date().toISOString(),
      attachments: input.attachments ?? [],
      reactions: [],
      status: "sent",
      replyToId: input.replyToId,
    };
    this.messages.push(msg);
    const conv = this.conversations.find((c) => c.id === input.conversationId);
    if (conv) conv.lastMessage = msg;
    this.emit();
    setTimeout(() => {
      msg.status = "delivered";
      this.emit();
      setTimeout(() => {
        msg.status = "read";
        this.emit();
      }, 1200);
    }, 700);
    return msg;
  }

  async editMessage(id: ID, body: string) {
    await delay(150);
    const m = this.messages.find((x) => x.id === id);
    if (!m) throw new Error("Message not found");
    m.body = body;
    m.editedAt = new Date().toISOString();
    this.emit();
    return m;
  }

  async deleteMessage(id: ID) {
    await delay(150);
    const m = this.messages.find((x) => x.id === id);
    if (m) {
      m.deleted = true;
      m.body = "";
      m.attachments = [];
    }
    this.emit();
  }

  async react(messageId: ID, emoji: string) {
    await delay(80);
    const m = this.messages.find((x) => x.id === messageId);
    if (!m) throw new Error("Message not found");
    const me = "u_me";
    let r = m.reactions.find((x) => x.emoji === emoji);
    if (!r) {
      r = { emoji, userIds: [] };
      m.reactions.push(r);
    }
    if (r.userIds.includes(me)) r.userIds = r.userIds.filter((u) => u !== me);
    else r.userIds.push(me);
    m.reactions = m.reactions.filter((x) => x.userIds.length > 0);
    this.emit();
    return m;
  }

  async setTyping() {
    // no-op mock
  }

  async markRead(conversationId: ID) {
    const c = this.conversations.find((x) => x.id === conversationId);
    if (c) {
      c.unreadCount = 0;
      this.emit();
    }
  }

  async pinConversation(id: ID, pinned: boolean) {
    const c = this.mustGet(id);
    c.pinned = pinned;
    this.emit();
    return c;
  }

  async muteConversation(id: ID, muted: boolean) {
    const c = this.mustGet(id);
    c.muted = muted;
    this.emit();
    return c;
  }

  async archiveConversation(id: ID, archived: boolean) {
    const c = this.mustGet(id);
    c.archived = archived;
    this.emit();
    return c;
  }

  async createConversation(input: {
    memberIds: ID[];
    kind: ConversationKind;
    name?: string;
    avatarUrl?: string;
  }) {
    await delay();
    const id = "c_" + Math.random().toString(36).slice(2, 8);
    const conv: Conversation = {
      id,
      kind: input.kind,
      name: input.name,
      avatarUrl: input.avatarUrl,
      memberIds: Array.from(new Set(["u_me", ...input.memberIds])),
      adminIds: input.kind === "group" ? ["u_me"] : [],
      createdAt: new Date().toISOString(),
      unreadCount: 0,
      pinned: false,
      muted: false,
      archived: false,
      typingUserIds: [],
    };
    this.conversations.push(conv);
    this.emit();
    return conv;
  }

  async forwardMessage({ messageId, conversationIds }: { messageId: ID; conversationIds: ID[] }) {
    await delay(300);
    const src = this.messages.find((m) => m.id === messageId);
    if (!src) throw new Error("Message not found");
    for (const cid of conversationIds) {
      const clone: Message = {
        id: "m_" + Math.random().toString(36).slice(2, 10),
        conversationId: cid,
        authorId: "u_me",
        body: src.body,
        createdAt: new Date().toISOString(),
        attachments: [...src.attachments],
        reactions: [],
        status: "sent",
      };
      this.messages.push(clone);
      const conv = this.conversations.find((c) => c.id === cid);
      if (conv) conv.lastMessage = clone;
    }
    this.emit();
  }

  async searchMessages(query: string) {
    await delay(150);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: SearchHit[] = [];
    for (const m of this.messages) {
      if (m.deleted) continue;
      if (m.body.toLowerCase().includes(q)) {
        hits.push({ conversationId: m.conversationId, message: m });
      }
    }
    return hits
      .sort((a, b) => Date.parse(b.message.createdAt) - Date.parse(a.message.createdAt))
      .slice(0, 40);
  }

  async updateConversation(id: ID, patch: { name?: string; description?: string; avatarUrl?: string }) {
    await delay(180);
    const c = this.mustGet(id);
    if (c.kind !== "group") throw new Error("Only groups can be renamed.");
    if (patch.name !== undefined) c.name = patch.name;
    if (patch.description !== undefined) c.description = patch.description;
    if (patch.avatarUrl !== undefined) c.avatarUrl = patch.avatarUrl;
    this.emit();
    return c;
  }

  async addMembers(conversationId: ID, memberIds: ID[]) {
    await delay(200);
    const c = this.mustGet(conversationId);
    if (c.kind !== "group") throw new Error("Members can only be added to groups.");
    c.memberIds = Array.from(new Set([...c.memberIds, ...memberIds]));
    this.emit();
    return c;
  }

  async removeMember(conversationId: ID, userId: ID) {
    await delay(180);
    const c = this.mustGet(conversationId);
    if (c.kind !== "group") throw new Error("Members can only be removed from groups.");
    c.memberIds = c.memberIds.filter((id) => id !== userId);
    c.adminIds = c.adminIds.filter((id) => id !== userId);
    this.emit();
    return c;
  }

  async promoteAdmin(conversationId: ID, userId: ID) {
    await delay(150);
    const c = this.mustGet(conversationId);
    if (!c.memberIds.includes(userId)) throw new Error("Not a member.");
    if (!c.adminIds.includes(userId)) c.adminIds.push(userId);
    this.emit();
    return c;
  }

  async demoteAdmin(conversationId: ID, userId: ID) {
    await delay(150);
    const c = this.mustGet(conversationId);
    c.adminIds = c.adminIds.filter((id) => id !== userId);
    this.emit();
    return c;
  }

  async leaveConversation(id: ID) {
    await delay(180);
    const c = this.mustGet(id);
    c.memberIds = c.memberIds.filter((m) => m !== "u_me");
    c.adminIds = c.adminIds.filter((m) => m !== "u_me");
    this.conversations = this.conversations.filter((x) => x.id !== id);
    this.emit();
  }

  async deleteConversation(id: ID) {
    await delay(180);
    this.conversations = this.conversations.filter((x) => x.id !== id);
    this.messages = this.messages.filter((m) => m.conversationId !== id);
    this.emit();
  }

  async getSharedAttachments(conversationId: ID) {
    await delay(120);
    const atts: Attachment[] = [];
    for (const m of this.messages) {
      if (m.conversationId !== conversationId || m.deleted) continue;
      atts.push(...m.attachments);
    }
    return atts;
  }
}
