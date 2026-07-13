import { Badge, Input, makeStyles, tokens, Text, Button, Tooltip } from "@fluentui/react-components";
import { SearchRegular, EditRegular, DismissRegular, GlobeSearchRegular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import type { Conversation } from "@/services/types";
import { Avatar } from "@/components/Avatar";
import { ConversationListSkeleton } from "@/components/Skeletons";
import { formatRelative } from "@/utils/date";
import { conversationAvatar, conversationTitle } from "@/features/chat/helpers";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: 0,
  },
  header: {
    padding: tokens.spacingHorizontalL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase500 },
  list: { overflowY: "auto", flex: 1, padding: `${tokens.spacingVerticalXS} 0` },
  item: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    width: "100%",
    textAlign: "left",
    color: tokens.colorNeutralForeground1,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
    ":focus-visible": { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: "-2px" },
  },
  itemActive: {
    backgroundColor: tokens.colorNeutralBackground3Selected,
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Selected },
  },
  content: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" },
  row1: { display: "flex", justifyContent: "space-between", gap: tokens.spacingHorizontalS },
  name: {
    fontWeight: tokens.fontWeightSemibold,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  timestamp: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, flexShrink: 0 },
  preview: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  row2: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: tokens.spacingHorizontalS },
  empty: {
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  pin: { fontSize: "10px", color: tokens.colorNeutralForeground3, letterSpacing: "0.06em", textTransform: "uppercase", padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}` },
});

interface Props {
  conversations: Conversation[];
  activeId?: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSearch: () => void;
  onClose?: () => void; // mobile drawer close
}

export function ConversationSidebar({ conversations, activeId, loading, onSelect, onNew, onSearch, onClose }: Props) {
  const s = useStyles();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return conversations;
    const needle = q.toLowerCase();
    return conversations.filter((c) => {
      const title = conversationTitle(c).toLowerCase();
      const last = c.lastMessage?.body.toLowerCase() ?? "";
      return title.includes(needle) || last.includes(needle);
    });
  }, [conversations, q]);

  const pinned = filtered.filter((c) => c.pinned && !c.archived);
  const rest = filtered.filter((c) => !c.pinned && !c.archived);

  return (
    <aside className={s.root} aria-label="Conversations">
      <div className={s.header}>
        <div className={s.titleRow}>
          <div className={s.title}>Chats</div>
          <div style={{ display: "flex", gap: 4 }}>
            <Tooltip content="Search all messages (⌘K)" relationship="label">
              <Button aria-label="Search all messages" appearance="subtle" icon={<GlobeSearchRegular />} onClick={onSearch} />
            </Tooltip>
            <Tooltip content="New conversation" relationship="label">
              <Button aria-label="New conversation" appearance="subtle" icon={<EditRegular />} onClick={onNew} />
            </Tooltip>
            {onClose ? (
              <Tooltip content="Close" relationship="label">
                <Button aria-label="Close sidebar" appearance="subtle" icon={<DismissRegular />} onClick={onClose} />
              </Tooltip>
            ) : null}
          </div>
        </div>
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search conversations"
          value={q}
          onChange={(_, d) => setQ(d.value)}
          aria-label="Search conversations"
        />
      </div>

      <div className={s.list}>
        {loading ? (
          <ConversationListSkeleton />
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <Text>No conversations{q ? " match your search" : " yet"}.</Text>
          </div>
        ) : (
          <>
            {pinned.length > 0 && <div className={s.pin}>Pinned</div>}
            {pinned.map((c) => (
              <Row key={c.id} c={c} active={c.id === activeId} onSelect={onSelect} />
            ))}
            {rest.length > 0 && pinned.length > 0 && <div className={s.pin}>All chats</div>}
            {rest.map((c) => (
              <Row key={c.id} c={c} active={c.id === activeId} onSelect={onSelect} />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function Row({ c, active, onSelect }: { c: Conversation; active: boolean; onSelect: (id: string) => void }) {
  const s = useStyles();
  const avatar = conversationAvatar(c);
  const title = conversationTitle(c);
  const preview = c.lastMessage
    ? (c.lastMessage.authorId === "u_me" ? "You: " : "") + (c.lastMessage.body || "Attachment")
    : "No messages yet";
  return (
    <button
      type="button"
      className={active ? `${s.item} ${s.itemActive}` : s.item}
      onClick={() => onSelect(c.id)}
      aria-current={active ? "page" : undefined}
    >
      <Avatar name={avatar.name} image={avatar.image} presence={avatar.presence} showPresence={c.kind === "dm"} />
      <div className={s.content}>
        <div className={s.row1}>
          <span className={s.name}>{title}</span>
          {c.lastMessage ? <span className={s.timestamp}>{formatRelative(c.lastMessage.createdAt)}</span> : null}
        </div>
        <div className={s.row2}>
          <span className={s.preview}>{preview}</span>
          {c.unreadCount > 0 ? (
            <Badge appearance="filled" color="brand" size="small">{c.unreadCount}</Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
