export type ID = string;

export type Presence = "online" | "away" | "offline";

export interface User {
  id: ID;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  presence: Presence;
  lastSeen?: string; // ISO
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type AttachmentKind = "image" | "document";

export interface Attachment {
  id: ID;
  kind: AttachmentKind;
  name: string;
  url: string;
  sizeBytes: number;
  mime: string;
}

export interface Reaction {
  emoji: string;
  userIds: ID[];
}

export interface Message {
  id: ID;
  conversationId: ID;
  authorId: ID;
  body: string;
  createdAt: string; // ISO
  editedAt?: string;
  replyToId?: ID;
  attachments: Attachment[];
  reactions: Reaction[];
  status: MessageStatus;
  deleted?: boolean;
  mentions?: ID[];
}

export type ConversationKind = "dm" | "group";

export interface Conversation {
  id: ID;
  kind: ConversationKind;
  name?: string;
  avatarUrl?: string;
  description?: string;
  memberIds: ID[];
  adminIds: ID[];
  createdAt: string;
  lastMessage?: Message;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  typingUserIds: ID[];
}

export interface UserSettings {
  theme: "system" | "light" | "dark";
  browserNotifications: boolean;
  soundEnabled: boolean;
  enterToSend: boolean;
  showReadReceipts: boolean;
  showPresence: boolean;
}

export interface Session {
  user: User;
  token: string;
}

export interface Paged<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SearchHit {
  conversationId: ID;
  message: Message;
}

export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  signIn(input: { identifier: string; password: string; remember: boolean }): Promise<Session>;
  signUp(input: {
    displayName: string;
    username: string;
    email: string;
    password: string;
  }): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { token: string; password: string }): Promise<void>;

  updateProfile(
    patch: Partial<Pick<User, "displayName" | "username" | "bio" | "avatarUrl">>,
  ): Promise<User>;
  changePassword(input: { current: string; next: string }): Promise<void>;
  deleteAccount(password: string): Promise<void>;

  getSettings(): Promise<UserSettings>;
  updateSettings(patch: Partial<UserSettings>): Promise<UserSettings>;

  getBlockedUsers(): Promise<User[]>;
  blockUser(id: ID): Promise<void>;
  unblockUser(id: ID): Promise<void>;
}

export interface UserService {
  searchUsers(query: string): Promise<User[]>;
  getUser(id: ID): Promise<User | null>;
}

export interface ChatService {
  listConversations(): Promise<Conversation[]>;
  getConversation(id: ID): Promise<Conversation | null>;
  getMessages(
    conversationId: ID,
    opts?: { before?: string; limit?: number },
  ): Promise<Paged<Message>>;
  sendMessage(input: {
    conversationId: ID;
    body: string;
    replyToId?: ID;
    attachments?: Attachment[];
    clientId: string;
  }): Promise<Message>;
  editMessage(id: ID, body: string): Promise<Message>;
  deleteMessage(id: ID): Promise<void>;
  react(messageId: ID, emoji: string): Promise<Message>;
  setTyping(conversationId: ID, isTyping: boolean): Promise<void>;
  markRead(conversationId: ID): Promise<void>;
  pinConversation(id: ID, pinned: boolean): Promise<Conversation>;
  muteConversation(id: ID, muted: boolean): Promise<Conversation>;
  archiveConversation(id: ID, archived: boolean): Promise<Conversation>;
  createConversation(input: {
    memberIds: ID[];
    kind: ConversationKind;
    name?: string;
    avatarUrl?: string;
  }): Promise<Conversation>;

  forwardMessage(input: { messageId: ID; conversationIds: ID[] }): Promise<void>;
  searchMessages(query: string): Promise<SearchHit[]>;

  updateConversation(
    id: ID,
    patch: { name?: string; description?: string; avatarUrl?: string },
  ): Promise<Conversation>;
  addMembers(conversationId: ID, memberIds: ID[]): Promise<Conversation>;
  removeMember(conversationId: ID, userId: ID): Promise<Conversation>;
  promoteAdmin(conversationId: ID, userId: ID): Promise<Conversation>;
  demoteAdmin(conversationId: ID, userId: ID): Promise<Conversation>;
  leaveConversation(id: ID): Promise<void>;
  deleteConversation(id: ID): Promise<void>;
  getSharedAttachments(conversationId: ID): Promise<Attachment[]>;

  subscribe(listener: () => void): () => void;
}
