import type { Conversation, Message, User } from "@/services/types";

export const seedUsers: User[] = [
  { id: "u_me", username: "you", displayName: "You", email: "you@pulse.app", presence: "online", bio: "Product designer. Coffee first." },
  { id: "u_ada", username: "ada", displayName: "Ada Lovelace", email: "ada@pulse.app", presence: "online", bio: "Notes on notes." },
  { id: "u_lin", username: "linus", displayName: "Linus Wren", email: "linus@pulse.app", presence: "away", lastSeen: new Date(Date.now() - 15 * 60_000).toISOString(), bio: "Systems." },
  { id: "u_mia", username: "mia", displayName: "Mia Okafor", email: "mia@pulse.app", presence: "offline", lastSeen: new Date(Date.now() - 3 * 3600_000).toISOString(), bio: "Illustration & type." },
  { id: "u_ren", username: "renji", displayName: "Renji Sato", email: "renji@pulse.app", presence: "online", bio: "Weekend runner." },
  { id: "u_pri", username: "priya", displayName: "Priya Menon", email: "priya@pulse.app", presence: "away", lastSeen: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: "u_kai", username: "kai", displayName: "Kai Berg", email: "kai@pulse.app", presence: "offline", lastSeen: new Date(Date.now() - 26 * 3600_000).toISOString() },
];

const iso = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function baseMsg(
  id: string,
  conversationId: string,
  authorId: string,
  body: string,
  minutesAgo: number,
): Message {
  return {
    id,
    conversationId,
    authorId,
    body,
    createdAt: iso(minutesAgo),
    attachments: [],
    reactions: [],
    status: "read",
  };
}

export const seedConversations: Conversation[] = [
  {
    id: "c_ada",
    kind: "dm",
    memberIds: ["u_me", "u_ada"],
    adminIds: [],
    createdAt: iso(60 * 24 * 3),
    unreadCount: 2,
    pinned: true,
    muted: false,
    archived: false,
    typingUserIds: [],
  },
  {
    id: "c_design",
    kind: "group",
    name: "Design Guild",
    memberIds: ["u_me", "u_ada", "u_mia", "u_pri", "u_ren"],
    adminIds: ["u_me", "u_ada"],
    createdAt: iso(60 * 24 * 14),
    unreadCount: 0,
    pinned: true,
    muted: false,
    archived: false,
    typingUserIds: ["u_mia"],
  },
  {
    id: "c_lin",
    kind: "dm",
    memberIds: ["u_me", "u_lin"],
    adminIds: [],
    createdAt: iso(60 * 24 * 5),
    unreadCount: 0,
    pinned: false,
    muted: true,
    archived: false,
    typingUserIds: [],
  },
  {
    id: "c_run",
    kind: "group",
    name: "Sunday Run Club",
    memberIds: ["u_me", "u_ren", "u_kai", "u_pri"],
    adminIds: ["u_ren"],
    createdAt: iso(60 * 24 * 30),
    unreadCount: 5,
    pinned: false,
    muted: false,
    archived: false,
    typingUserIds: [],
  },
  {
    id: "c_mia",
    kind: "dm",
    memberIds: ["u_me", "u_mia"],
    adminIds: [],
    createdAt: iso(60 * 24 * 1),
    unreadCount: 0,
    pinned: false,
    muted: false,
    archived: false,
    typingUserIds: [],
  },
];

export const seedMessages: Message[] = [
  baseMsg("m1", "c_ada", "u_ada", "Hey! Did you get a chance to look at the new onboarding flow?", 60 * 24),
  baseMsg("m2", "c_ada", "u_me", "Yes — the empty state is much sharper now.", 60 * 23),
  baseMsg("m3", "c_ada", "u_ada", "Great. I'll ship it to staging tonight.", 60 * 22),
  baseMsg("m4", "c_ada", "u_ada", "Also: coffee tomorrow?", 12),
  baseMsg("m5", "c_ada", "u_ada", "The place on 4th, 9:30?", 10),

  baseMsg("m10", "c_design", "u_mia", "New icon set is up in Figma 🎨", 60 * 4),
  baseMsg("m11", "c_design", "u_pri", "Loving the density change.", 60 * 4 - 5),
  baseMsg("m12", "c_design", "u_me", "Same. Approved from me.", 60 * 4 - 15),
  baseMsg("m13", "c_design", "u_ada", "Let's ship Friday.", 60 * 3),

  baseMsg("m20", "c_lin", "u_me", "Deploy blocked again?", 60 * 26),
  baseMsg("m21", "c_lin", "u_lin", "Yeah — flaky test. Fix incoming.", 60 * 25),

  baseMsg("m30", "c_run", "u_ren", "6am Sunday. Loop through the park.", 60 * 8),
  baseMsg("m31", "c_run", "u_kai", "In.", 60 * 8 - 30),
  baseMsg("m32", "c_run", "u_pri", "I'll bring water.", 60 * 7),
  baseMsg("m33", "c_run", "u_ren", "Route pinned above.", 60 * 6),
  baseMsg("m34", "c_run", "u_ren", "See everyone at the gate.", 60 * 1),

  baseMsg("m40", "c_mia", "u_mia", "Sent you the type specimen.", 60 * 12),
  baseMsg("m41", "c_mia", "u_me", "Thanks!", 60 * 11),
];

// wire lastMessage
for (const c of seedConversations) {
  const msgs = seedMessages.filter((m) => m.conversationId === c.id);
  c.lastMessage = msgs[msgs.length - 1];
}
