import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";
import {
  EmojiRegular,
  MoreVerticalRegular,
  ArrowReplyRegular,
  CopyRegular,
  EditRegular,
  DeleteRegular,
  ArrowClockwiseRegular,
  ErrorCircleRegular,
  DocumentRegular,
  CheckmarkRegular,
  ShareRegular,

} from "@fluentui/react-icons";
import { useState } from "react";
import type { Message } from "@/services/types";
import { chatService } from "@/services";
import { formatTime } from "@/utils/date";
import { getUser } from "@/features/chat/helpers";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";

const REACTIONS = ["👍", "❤️", "😂", "🎉", "🙌", "🤔"];

const useStyles = makeStyles({
  row: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    alignItems: "flex-start",
  },
  mine: { flexDirection: "row-reverse" },
  avatarSlot: { width: "32px", flexShrink: 0 },
  bubbleCol: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    maxWidth: "70%",
    minWidth: 0,
  },
  bubbleColMine: { alignItems: "flex-end" },
  meta: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    padding: `0 ${tokens.spacingHorizontalXS}`,
  },
  bubble: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    position: "relative",
  },
  bubbleMine: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  reply: {
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    paddingLeft: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase200,
    opacity: 0.85,
  },
  actions: {
    display: "none",
    gap: "2px",
    alignItems: "center",
  },
  rowHover: {
    ":hover [data-actions]": { display: "inline-flex" },
    ":focus-within [data-actions]": { display: "inline-flex" },
  },
  reactionsRow: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginTop: "2px",
  },
  reactionPill: {
    fontSize: tokens.fontSizeBase200,
    padding: `2px ${tokens.spacingHorizontalXS}`,
    minHeight: "unset",
  },
  reactPicker: { display: "flex", gap: "4px", padding: tokens.spacingHorizontalXS },
  reactBtn: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: tokens.borderRadiusMedium,
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
  attach: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  imageAttach: {
    maxWidth: "260px",
    maxHeight: "260px",
    borderRadius: tokens.borderRadiusMedium,
    objectFit: "cover",
  },
  fileAttach: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  edited: { fontStyle: "italic", opacity: 0.7, fontSize: tokens.fontSizeBase100, marginLeft: "6px" },
  failed: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  editArea: {
    width: "100%",
    minWidth: "200px",
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    fontFamily: "inherit",
    fontSize: "inherit",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    resize: "vertical",
  },
  editRow: { display: "flex", gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXS },
});

interface Props {
  message: Message;
  showAvatar: boolean;
  onReply: (m: Message) => void;
  onRetry?: (id: string) => void;
  onDiscard?: (id: string) => void;
}

export function MessageBubble({ message, showAvatar, onReply, onRetry, onDiscard }: Props) {
  const s = useStyles();
  const toast = useToast();
  const mine = message.authorId === "u_me";
  const author = getUser(message.authorId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function statusIcon() {
    if (!mine) return null;
    if (message.status === "sending") return <span aria-label="Sending">…</span>;
    if (message.status === "failed") return null;
    if (message.status === "read") return <span aria-label="Read" style={{ color: tokens.colorBrandForeground1, display: "inline-flex" }}><CheckmarkRegular /><CheckmarkRegular style={{ marginLeft: -6 }} /></span>;
    if (message.status === "delivered") return <span aria-label="Delivered" style={{ opacity: 0.7, display: "inline-flex" }}><CheckmarkRegular /><CheckmarkRegular style={{ marginLeft: -6 }} /></span>;
    return <CheckmarkRegular aria-label="Sent" />;
  }

  if (message.deleted) {
    return (
      <div className={mergeClasses(s.row, mine && s.mine)}>
        <div className={s.avatarSlot}>
          {showAvatar && !mine ? <Avatar name={author?.displayName ?? "?"} size={28} /> : null}
        </div>
        <div className={mergeClasses(s.bubbleCol, mine && s.bubbleColMine)}>
          <div className={s.bubble} style={{ fontStyle: "italic", opacity: 0.6 }}>
            Message deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={mergeClasses(s.row, mine && s.mine, s.rowHover)}>
      <div className={s.avatarSlot}>
        {showAvatar && !mine ? (
          <Avatar name={author?.displayName ?? "?"} image={author?.avatarUrl} size={28} presence={author?.presence} showPresence />
        ) : null}
      </div>
      <div className={mergeClasses(s.bubbleCol, mine && s.bubbleColMine)}>
        {showAvatar && !mine ? (
          <div className={s.meta}>
            <span>{author?.displayName ?? "Unknown"}</span>
            <span>{formatTime(message.createdAt)}</span>
          </div>
        ) : null}
        <div className={mergeClasses(s.bubble, mine && s.bubbleMine)}>
          {message.replyToId ? (
            <div className={s.reply}>Reply</div>
          ) : null}
          {editing ? (
            <div>
              <textarea
                className={s.editArea}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                rows={3}
              />
              <div className={s.editRow}>
                <Button size="small" appearance="secondary" onClick={() => { setEditing(false); setDraft(message.body); }}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  appearance="primary"
                  onClick={async () => {
                    if (draft.trim() && draft !== message.body) {
                      await chatService.editMessage(message.id, draft.trim());
                    }
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.body ? <span>{message.body}</span> : null}
              {message.editedAt ? <span className={s.edited}>edited</span> : null}
              {message.attachments.length > 0 ? (
                <div className={s.attach}>
                  {message.attachments.map((a) =>
                    a.kind === "image" ? (
                      <img key={a.id} src={a.url} alt={a.name} className={s.imageAttach} />
                    ) : (
                      <a key={a.id} href={a.url} className={s.fileAttach} target="_blank" rel="noreferrer">
                        <DocumentRegular /> {a.name}
                      </a>
                    ),
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        {message.reactions.length > 0 ? (
          <div className={s.reactionsRow}>
            {message.reactions.map((r) => (
              <Button
                key={r.emoji}
                appearance={r.userIds.includes("u_me") ? "primary" : "secondary"}
                size="small"
                className={s.reactionPill}
                onClick={() => chatService.react(message.id, r.emoji)}
                aria-label={`${r.emoji} reaction, ${r.userIds.length}`}
              >
                {r.emoji} {r.userIds.length}
              </Button>
            ))}
          </div>
        ) : null}

        {message.status === "failed" ? (
          <div className={s.failed}>
            <ErrorCircleRegular /> Not delivered.
            <Button size="small" appearance="transparent" onClick={() => onRetry?.(message.id)}>
              Retry
            </Button>
            <Button size="small" appearance="transparent" onClick={() => onDiscard?.(message.id)}>
              Discard
            </Button>
          </div>
        ) : (
          <div className={s.meta}>{statusIcon()}</div>
        )}
      </div>

      <div className={s.actions} data-actions>
        <Popover positioning="above" withArrow>
          <PopoverTrigger disableButtonEnhancement>
            <Tooltip content="React" relationship="label">
              <Button aria-label="Add reaction" appearance="subtle" size="small" icon={<EmojiRegular />} />
            </Tooltip>
          </PopoverTrigger>
          <PopoverSurface>
            <div className={s.reactPicker}>
              {REACTIONS.map((e) => (
                <button key={e} className={s.reactBtn} onClick={() => chatService.react(message.id, e)} aria-label={`React with ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </PopoverSurface>
        </Popover>
        <Tooltip content="Reply" relationship="label">
          <Button aria-label="Reply" appearance="subtle" size="small" icon={<ArrowReplyRegular />} onClick={() => onReply(message)} />
        </Tooltip>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="More" relationship="label">
              <Button aria-label="More actions" appearance="subtle" size="small" icon={<MoreVerticalRegular />} />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<CopyRegular />} onClick={() => { navigator.clipboard?.writeText(message.body); toast.show({ title: "Copied", intent: "success" }); }}>
                Copy text
              </MenuItem>
              {mine ? (
                <MenuItem icon={<EditRegular />} onClick={() => setEditing(true)}>Edit</MenuItem>
              ) : null}
              {mine ? (
                <MenuItem icon={<DeleteRegular />} onClick={() => setConfirmDelete(true)}>Delete</MenuItem>
              ) : null}
              {message.status === "failed" ? (
                <MenuItem icon={<ArrowClockwiseRegular />} onClick={() => onRetry?.(message.id)}>Retry</MenuItem>
              ) : null}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this message?"
        description="This can't be undone. The message will be removed for everyone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => chatService.deleteMessage(message.id)}
      />
    </div>
  );
}
