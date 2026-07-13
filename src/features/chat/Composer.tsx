import { useRef, useState } from "react";
import {
  Button,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
  ProgressBar,
  Popover,
  PopoverSurface,
  PopoverTrigger,
} from "@fluentui/react-components";
import {
  SendRegular,
  AttachRegular,
  EmojiRegular,
  DismissRegular,
  ImageRegular,
  DocumentRegular,
  ArrowReplyRegular,
} from "@fluentui/react-icons";
import type { Attachment, Message } from "@/services/types";
import { getUser } from "@/features/chat/helpers";

const EMOJI = ["😀", "😂", "😍", "🥲", "🤔", "👍", "🙏", "🎉", "🔥", "💯", "❤️", "😢", "😮", "🙌", "✨", "🚀"];

const useStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: tokens.spacingHorizontalM,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  replyBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
  },
  replyText: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: tokens.spacingHorizontalS,
  },
  textareaWrap: { flex: 1 },
  attachRow: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  attachChip: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    maxWidth: "240px",
  },
  attachChipFail: { backgroundColor: tokens.colorPaletteRedBackground2, color: tokens.colorPaletteRedForeground1 },
  chipName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  emojiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: "4px",
    padding: tokens.spacingHorizontalS,
    maxWidth: "260px",
  },
  emojiBtn: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px",
    borderRadius: tokens.borderRadiusMedium,
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
});

interface Pending extends Attachment {
  progress: number;
  failed?: boolean;
}

interface Props {
  onSend: (input: { body: string; replyToId?: string; attachments?: Attachment[] }) => void;
  replyTo?: Message | null;
  onClearReply: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, replyTo, onClearReply, disabled, placeholder }: Props) {
  const s = useStyles();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function submit() {
    const body = text.trim();
    if (!body && pending.length === 0) return;
    if (pending.some((p) => p.progress < 100 && !p.failed)) return;
    const attachments: Attachment[] = pending
      .filter((p) => !p.failed)
      .map(({ progress, failed, ...a }) => a);
    onSend({ body, replyToId: replyTo?.id, attachments: attachments.length ? attachments : undefined });
    setText("");
    setPending([]);
    onClearReply();
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = "att_" + Math.random().toString(36).slice(2);
      const kind = file.type.startsWith("image/") ? "image" : "document";
      const url = URL.createObjectURL(file);
      const newP: Pending = {
        id,
        kind,
        name: file.name,
        url,
        sizeBytes: file.size,
        mime: file.type,
        progress: 0,
      };
      setPending((prev) => [...prev, newP]);
      // simulate upload
      const willFail = Math.random() < 0.1;
      const step = () => {
        setPending((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const next = Math.min(100, p.progress + 20 + Math.random() * 20);
            if (next >= 100 && willFail) return { ...p, progress: 100, failed: true };
            return { ...p, progress: next };
          }),
        );
      };
      const iv = window.setInterval(() => {
        setPending((prev) => {
          const cur = prev.find((p) => p.id === id);
          if (!cur) { window.clearInterval(iv); return prev; }
          if (cur.progress >= 100 || cur.failed) { window.clearInterval(iv); return prev; }
          return prev;
        });
        step();
      }, 250);
    });
  }

  return (
    <div className={s.root}>
      {replyTo ? (
        <div className={s.replyBar}>
          <ArrowReplyRegular />
          <div className={s.replyText}>
            Replying to <b>{getUser(replyTo.authorId)?.displayName ?? "someone"}</b>: {replyTo.body}
          </div>
          <Button aria-label="Cancel reply" appearance="subtle" size="small" icon={<DismissRegular />} onClick={onClearReply} />
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className={s.attachRow}>
          {pending.map((p) => (
            <div key={p.id} className={p.failed ? `${s.attachChip} ${s.attachChipFail}` : s.attachChip}>
              {p.kind === "image" ? <ImageRegular /> : <DocumentRegular />}
              <span className={s.chipName}>{p.name}</span>
              {!p.failed && p.progress < 100 ? (
                <div style={{ width: 60 }}>
                  <ProgressBar value={p.progress / 100} thickness="medium" />
                </div>
              ) : null}
              {p.failed ? <span>failed</span> : null}
              <Button
                aria-label={`Remove ${p.name}`}
                appearance="transparent"
                size="small"
                icon={<DismissRegular />}
                onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className={s.row}>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
        />
        <Tooltip content="Attach file" relationship="label">
          <Button
            aria-label="Attach file"
            appearance="subtle"
            icon={<AttachRegular />}
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
          />
        </Tooltip>
        <Popover>
          <PopoverTrigger disableButtonEnhancement>
            <Tooltip content="Emoji" relationship="label">
              <Button aria-label="Insert emoji" appearance="subtle" icon={<EmojiRegular />} disabled={disabled} />
            </Tooltip>
          </PopoverTrigger>
          <PopoverSurface>
            <div className={s.emojiGrid}>
              {EMOJI.map((e) => (
                <button key={e} className={s.emojiBtn} onClick={() => setText((t) => t + e)} aria-label={`Insert ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </PopoverSurface>
        </Popover>
        <div className={s.textareaWrap}>
          <Textarea
            value={text}
            onChange={(_, d) => setText(d.value)}
            placeholder={placeholder ?? "Write a message… (Enter to send, Shift+Enter for a new line)"}
            resize="vertical"
            disabled={disabled}
            aria-label="Message input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            style={{ width: "100%" }}
          />
        </div>
        <Tooltip content="Send" relationship="label">
          <Button
            aria-label="Send message"
            appearance="primary"
            icon={<SendRegular />}
            onClick={submit}
            disabled={disabled || (!text.trim() && pending.filter((p) => !p.failed).length === 0)}
          />
        </Tooltip>
      </div>
    </div>
  );
}
