import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  makeStyles,
  tokens,
  Text,
  Checkbox,
} from "@fluentui/react-components";
import { SearchRegular, ShareRegular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { chatService } from "@/services";
import type { Conversation, Message } from "@/services/types";
import { Avatar } from "@/components/Avatar";
import { conversationAvatar, conversationTitle } from "@/features/chat/helpers";
import { useToast } from "@/components/Toaster";

const useStyles = makeStyles({
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    minHeight: "360px",
  },
  preview: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    maxHeight: "280px",
    overflowY: "auto",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  info: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  message: Message | null;
}

export function ForwardMessageDialog({ open, onOpenChange, message }: Props) {
  const s = useStyles();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    chatService.listConversations().then(setConvs);
    setPicked(new Set());
    setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return convs;
    return convs.filter((c) => conversationTitle(c).toLowerCase().includes(needle));
  }, [q, convs]);

  async function forward() {
    if (!message || picked.size === 0) return;
    setSending(true);
    try {
      await chatService.forwardMessage({ messageId: message.id, conversationIds: [...picked] });
      toast.show({
        title: `Forwarded to ${picked.size} chat${picked.size > 1 ? "s" : ""}`,
        intent: "success",
      });
      onOpenChange(false);
    } catch (e) {
      toast.show({ title: "Could not forward", body: (e as Error).message, intent: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Forward message</DialogTitle>
          <DialogContent>
            <div className={s.wrap}>
              {message ? (
                <div className={s.preview}>
                  {message.body ||
                    (message.attachments.length > 0
                      ? `${message.attachments.length} attachment(s)`
                      : "Message")}
                </div>
              ) : null}
              <Input
                contentBefore={<SearchRegular />}
                placeholder="Search conversations"
                value={q}
                onChange={(_, d) => setQ(d.value)}
              />
              <div className={s.list}>
                {filtered.length === 0 ? (
                  <div
                    style={{
                      padding: tokens.spacingVerticalL,
                      textAlign: "center",
                      color: tokens.colorNeutralForeground3,
                    }}
                  >
                    <Text>No conversations match.</Text>
                  </div>
                ) : (
                  filtered.map((c) => {
                    const avatar = conversationAvatar(c);
                    const on = picked.has(c.id);
                    return (
                      <label key={c.id} className={s.row}>
                        <Checkbox
                          checked={on}
                          onChange={(_, d) => {
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (d.checked) next.add(c.id);
                              else next.delete(c.id);
                              return next;
                            });
                          }}
                        />
                        <Avatar name={avatar.name} image={avatar.image} size={32} />
                        <div className={s.info}>
                          <Text weight="semibold" truncate wrap={false}>
                            {conversationTitle(c)}
                          </Text>
                          <Text
                            size={200}
                            style={{ color: tokens.colorNeutralForeground3 }}
                            truncate
                            wrap={false}
                          >
                            {c.kind === "group"
                              ? `${c.memberIds.length} members`
                              : "Direct message"}
                          </Text>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={<ShareRegular />}
              onClick={forward}
              disabled={picked.size === 0 || sending}
            >
              {sending ? "Sending…" : `Forward${picked.size ? ` (${picked.size})` : ""}`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
