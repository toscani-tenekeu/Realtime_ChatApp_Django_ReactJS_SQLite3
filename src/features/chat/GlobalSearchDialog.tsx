import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Input,
  makeStyles,
  tokens,
  Text,
  Spinner,
} from "@fluentui/react-components";
import { SearchRegular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { chatService } from "@/services";
import type { Conversation, SearchHit } from "@/services/types";
import { Avatar } from "@/components/Avatar";
import { conversationAvatar, conversationTitle, getUser } from "@/features/chat/helpers";
import { formatRelative } from "@/utils/date";

const useStyles = makeStyles({
  content: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minHeight: "380px" },
  hits: { display: "flex", flexDirection: "column", maxHeight: "420px", overflowY: "auto" },
  row: {
    display: "flex", alignItems: "flex-start", gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer", border: "none", background: "transparent",
    textAlign: "left", color: tokens.colorNeutralForeground1, width: "100%",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  info: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" },
  meta: { display: "flex", justifyContent: "space-between", gap: tokens.spacingHorizontalM },
  body: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  highlight: { backgroundColor: tokens.colorBrandBackground2, padding: "0 2px", borderRadius: "2px" },
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigate: (conversationId: string) => void;
}

export function GlobalSearchDialog({ open, onOpenChange, onNavigate }: Props) {
  const s = useStyles();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHits([]);
      chatService.listConversations().then(setConvs);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    chatService.searchMessages(q).then((res) => {
      if (cancelled) return;
      setHits(res);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [q, open]);

  const convById = useMemo(() => new Map(convs.map((c) => [c.id, c])), [convs]);

  function highlight(text: string) {
    if (!q.trim()) return text;
    const needle = q.trim();
    const i = text.toLowerCase().indexOf(needle.toLowerCase());
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <span className={s.highlight}>{text.slice(i, i + needle.length)}</span>
        {text.slice(i + needle.length)}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface style={{ maxWidth: 640 }}>
        <DialogBody>
          <DialogTitle>Search</DialogTitle>
          <DialogContent>
            <div className={s.content}>
              <Input
                autoFocus
                contentBefore={<SearchRegular />}
                placeholder="Search messages across all conversations"
                value={q}
                onChange={(_, d) => setQ(d.value)}
              />
              <div className={s.hits}>
                {loading ? (
                  <div style={{ padding: tokens.spacingVerticalXL, display: "grid", placeItems: "center" }}>
                    <Spinner size="tiny" label="Searching…" />
                  </div>
                ) : !q.trim() ? (
                  <div style={{ padding: tokens.spacingVerticalXL, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                    <Text>Type to search messages in every conversation.</Text>
                  </div>
                ) : hits.length === 0 ? (
                  <div style={{ padding: tokens.spacingVerticalXL, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                    <Text>No messages match "{q}".</Text>
                  </div>
                ) : (
                  hits.map((h) => {
                    const conv = convById.get(h.conversationId);
                    const avatar = conv ? conversationAvatar(conv) : { name: "?", image: undefined };
                    const author = getUser(h.message.authorId);
                    return (
                      <button
                        key={h.message.id}
                        type="button"
                        className={s.row}
                        onClick={() => { onNavigate(h.conversationId); onOpenChange(false); }}
                      >
                        <Avatar name={avatar.name} image={avatar.image} size={36} />
                        <div className={s.info}>
                          <div className={s.meta}>
                            <Text weight="semibold" truncate wrap={false}>
                              {conv ? conversationTitle(conv) : "Conversation"}
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {formatRelative(h.message.createdAt)}
                            </Text>
                          </div>
                          <div className={s.body}>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {author?.displayName ?? "Unknown"}:
                            </Text>{" "}
                            {highlight(h.message.body)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
