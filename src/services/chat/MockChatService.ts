import type {
  Attachment,
  ChatService,
  Conversation,
  ConversationKind,
  ID,
  Message,
  Paged,
} from "@/services/types";
import { seedConversations, seedMessages } from "@/mocks/seed";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// Occasional random failure to exercise failed/retry UI.
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
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("Not found");
    c.pinned = pinned;
    this.emit();
    return c;
  }

  async muteConversation(id: ID, muted: boolean) {
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("Not found");
    c.muted = muted;
    this.emit();
    return c;
  }

  async archiveConversation(id: ID, archived: boolean) {
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("Not found");
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
}
