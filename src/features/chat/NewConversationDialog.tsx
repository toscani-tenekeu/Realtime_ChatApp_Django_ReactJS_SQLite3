import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Field,
  Switch,
  makeStyles,
  tokens,
  Text,
  Spinner,
} from "@fluentui/react-components";
import { SearchRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { userService, chatService } from "@/services";
import type { User } from "@/services/types";
import { Avatar } from "@/components/Avatar";

const useStyles = makeStyles({
  content: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minHeight: "360px" },
  list: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "280px",
    overflowY: "auto",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    width: "100%",
    textAlign: "left",
    color: tokens.colorNeutralForeground1,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  rowActive: { backgroundColor: tokens.colorBrandBackground2 },
  info: { flex: 1, display: "flex", flexDirection: "column" },
  name: { fontWeight: tokens.fontWeightSemibold },
  handle: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  selectedRow: {
    display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalXS,
  },
  chip: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: `2px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function NewConversationDialog({ open, onOpenChange, onCreated }: Props) {
  const s = useStyles();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    userService.searchUsers(q).then((res) => {
      if (!cancelled) {
        setUsers(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [q, open]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setGroupName("");
      setIsGroup(false);
      setQ("");
    }
  }, [open]);

  function toggle(u: User) {
    setSelected((prev) => {
      const has = prev.find((x) => x.id === u.id);
      if (isGroup) {
        return has ? prev.filter((x) => x.id !== u.id) : [...prev, u];
      }
      return has ? [] : [u];
    });
  }

  async function create() {
    if (selected.length === 0) return;
    if (isGroup && !groupName.trim()) return;
    setCreating(true);
    try {
      const conv = await chatService.createConversation({
        memberIds: selected.map((s) => s.id),
        kind: isGroup ? "group" : "dm",
        name: isGroup ? groupName.trim() : undefined,
      });
      onCreated(conv.id);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

  const canSubmit = selected.length > 0 && (!isGroup || groupName.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>New conversation</DialogTitle>
          <DialogContent>
            <div className={s.content}>
              <Switch checked={isGroup} onChange={(_, d) => { setIsGroup(d.checked); setSelected([]); }} label="Create a group" />
              {isGroup ? (
                <Field label="Group name" required>
                  <Input value={groupName} onChange={(_, d) => setGroupName(d.value)} placeholder="Design Guild" />
                </Field>
              ) : null}
              <Field label={isGroup ? "Add members" : "Find someone"}>
                <Input
                  contentBefore={<SearchRegular />}
                  value={q}
                  onChange={(_, d) => setQ(d.value)}
                  placeholder="Search by name or @username"
                  autoFocus
                />
              </Field>
              {selected.length > 0 ? (
                <div className={s.selectedRow}>
                  {selected.map((u) => (
                    <span key={u.id} className={s.chip}>
                      {u.displayName}
                      <button
                        aria-label={`Remove ${u.displayName}`}
                        onClick={() => toggle(u)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
                      >×</button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className={s.list}>
                {loading ? (
                  <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
                    <Spinner size="tiny" label="Searching…" />
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                    <Text>No people match "{q}".</Text>
                  </div>
                ) : (
                  users.map((u) => {
                    const active = !!selected.find((x) => x.id === u.id);
                    return (
                      <button key={u.id} type="button" className={active ? `${s.row} ${s.rowActive}` : s.row} onClick={() => toggle(u)}>
                        <Avatar name={u.displayName} image={u.avatarUrl} presence={u.presence} showPresence size={32} />
                        <div className={s.info}>
                          <span className={s.name}>{u.displayName}</span>
                          <span className={s.handle}>@{u.username}</span>
                        </div>
                        {active ? <span className={s.chip}>Selected</span> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button appearance="primary" disabled={!canSubmit || creating} onClick={create}>
              {creating ? "Creating…" : isGroup ? "Create group" : "Start chat"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
