import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Tooltip,
  Tab,
  TabList,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  makeStyles,
  tokens,
  Text,
  Field,
  Input,
  Textarea,
  Spinner,
  Divider,
} from "@fluentui/react-components";
import {
  DismissRegular,
  PersonAddRegular,
  ShieldPersonRegular,
  ShieldDismissRegular,
  PersonSubtractRegular,
  EditRegular,
  SignOutRegular,
  DeleteRegular,
  ImageRegular,
  DocumentRegular,
  MoreVerticalRegular,
  PersonProhibitedRegular,
  CheckmarkRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { chatService, userService, authService } from "@/services";
import type { Attachment, Conversation, User } from "@/services/types";
import { conversationAvatar, conversationTitle, getUser } from "@/features/chat/helpers";

const useStyles = makeStyles({
  content: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
  header: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  memberRow: {
    display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  info: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  adminTag: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorBrandForeground1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: tokens.spacingHorizontalS,
  },
  mediaThumb: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: tokens.borderRadiusMedium,
  },
  fileRow: {
    display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    textDecoration: "none",
    color: tokens.colorNeutralForeground1,
  },
  addRow: {
    display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalS,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

type Tab = "about" | "members" | "media";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onLeft?: () => void;
}

export function ConversationDetailsDrawer({ open, onOpenChange, conversation, onLeft }: Props) {
  const s = useStyles();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("about");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.name ?? "");
  const [description, setDescription] = useState(conversation.description ?? "");
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<User[]>([]);

  const isGroup = conversation.kind === "group";
  const meIsAdmin = conversation.adminIds.includes("u_me");
  const otherId = conversation.memberIds.find((id) => id !== "u_me");
  const other = getUser(otherId ?? "");
  const avatar = conversationAvatar(conversation);
  const title = conversationTitle(conversation);

  useEffect(() => {
    if (!open) return;
    setName(conversation.name ?? "");
    setDescription(conversation.description ?? "");
    setEditing(false);
    setTab("about");
  }, [open, conversation.id, conversation.name, conversation.description]);

  useEffect(() => {
    if (tab !== "media" || !open) return;
    setAttachments(null);
    chatService.getSharedAttachments(conversation.id).then(setAttachments);
  }, [tab, open, conversation.id]);

  useEffect(() => {
    if (!showAdd) return;
    let cancelled = false;
    userService.searchUsers(q).then((res) => {
      if (cancelled) return;
      setCandidates(res.filter((u) => !conversation.memberIds.includes(u.id)));
    });
    return () => { cancelled = true; };
  }, [showAdd, q, conversation.memberIds]);

  async function saveDetails() {
    try {
      await chatService.updateConversation(conversation.id, { name: name.trim(), description: description.trim() });
      toast.show({ title: "Group updated", intent: "success" });
      setEditing(false);
    } catch (e) {
      toast.show({ title: "Could not save", body: (e as Error).message, intent: "error" });
    }
  }

  async function leave() {
    await chatService.leaveConversation(conversation.id);
    toast.show({ title: "You left the conversation", intent: "info" });
    onOpenChange(false);
    onLeft?.();
  }

  async function deleteConv() {
    await chatService.deleteConversation(conversation.id);
    toast.show({ title: "Conversation deleted", intent: "info" });
    onOpenChange(false);
    onLeft?.();
  }

  const images = useMemo(() => attachments?.filter((a) => a.kind === "image") ?? [], [attachments]);
  const docs = useMemo(() => attachments?.filter((a) => a.kind === "document") ?? [], [attachments]);

  return (
    <>
      <Drawer open={open} onOpenChange={(_, d) => onOpenChange(d.open)} position="end" type="overlay" style={{ width: "min(400px, 95vw)" }}>
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Tooltip content="Close" relationship="label">
                <Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={() => onOpenChange(false)} />
              </Tooltip>
            }
          >
            Details
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody style={{ padding: 0 }}>
          <div className={s.header}>
            <Avatar name={avatar.name} image={avatar.image} presence={avatar.presence} showPresence={!isGroup} size={72} />
            <Text weight="semibold" size={500}>{title}</Text>
            {isGroup ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{conversation.memberIds.length} members</Text>
            ) : other ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>@{other.username}</Text>
            ) : null}
          </div>

          <div style={{ padding: `0 ${tokens.spacingHorizontalL}` }}>
            <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as Tab)}>
              <Tab value="about">About</Tab>
              {isGroup ? <Tab value="members">Members</Tab> : null}
              <Tab value="media">Shared</Tab>
            </TabList>
          </div>

          <div className={s.content}>
            {tab === "about" ? (
              <>
                {isGroup ? (
                  editing ? (
                    <>
                      <Field label="Group name" required>
                        <Input value={name} onChange={(_, d) => setName(d.value)} />
                      </Field>
                      <Field label="Description">
                        <Textarea value={description} onChange={(_, d) => setDescription(d.value)} rows={3} />
                      </Field>
                      <div style={{ display: "flex", gap: tokens.spacingHorizontalS }}>
                        <Button appearance="primary" onClick={saveDetails}>Save</Button>
                        <Button appearance="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Text weight="semibold">Description</Text>
                        <div><Text style={{ color: tokens.colorNeutralForeground2 }}>{conversation.description || "No description yet."}</Text></div>
                      </div>
                      {meIsAdmin ? (
                        <div>
                          <Button appearance="secondary" icon={<EditRegular />} onClick={() => setEditing(true)}>Edit group</Button>
                        </div>
                      ) : null}
                    </>
                  )
                ) : other ? (
                  <>
                    <div>
                      <Text weight="semibold">Bio</Text>
                      <div><Text style={{ color: tokens.colorNeutralForeground2 }}>{other.bio || "No bio yet."}</Text></div>
                    </div>
                    <div>
                      <Text weight="semibold">Email</Text>
                      <div><Text style={{ color: tokens.colorNeutralForeground2 }}>{other.email}</Text></div>
                    </div>
                  </>
                ) : null}
                <Divider />
                <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS }}>
                  {!isGroup && other ? (
                    <Button appearance="secondary" icon={<PersonProhibitedRegular />} onClick={() => setConfirmBlock(other)}>
                      Block {other.displayName}
                    </Button>
                  ) : null}
                  {isGroup ? (
                    <Button appearance="secondary" icon={<SignOutRegular />} onClick={() => setConfirmLeave(true)}>
                      Leave group
                    </Button>
                  ) : null}
                  <Button
                    icon={<DeleteRegular />}
                    onClick={() => setConfirmDelete(true)}
                    style={{ color: tokens.colorPaletteRedForeground1 }}
                    appearance="subtle"
                  >
                    Delete conversation
                  </Button>
                </div>
              </>
            ) : null}

            {tab === "members" && isGroup ? (
              <>
                {meIsAdmin ? (
                  <div className={s.addRow}>
                    <Button appearance="secondary" icon={<PersonAddRegular />} onClick={() => setShowAdd((v) => !v)}>
                      {showAdd ? "Close" : "Add members"}
                    </Button>
                    {showAdd ? (
                      <>
                        <Input placeholder="Search people" value={q} onChange={(_, d) => setQ(d.value)} />
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                          {candidates.length === 0 ? (
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>No one to add.</Text>
                          ) : candidates.map((u) => (
                            <div key={u.id} className={s.memberRow}>
                              <Avatar name={u.displayName} image={u.avatarUrl} size={32} />
                              <div className={s.info}>
                                <Text weight="semibold">{u.displayName}</Text>
                                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>@{u.username}</Text>
                              </div>
                              <Button
                                size="small"
                                appearance="primary"
                                icon={<CheckmarkRegular />}
                                onClick={async () => {
                                  await chatService.addMembers(conversation.id, [u.id]);
                                  toast.show({ title: `Added ${u.displayName}`, intent: "success" });
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {conversation.memberIds.map((id) => {
                  const u = getUser(id);
                  if (!u) return null;
                  const isAdmin = conversation.adminIds.includes(id);
                  const isMe = id === "u_me";
                  return (
                    <div key={id} className={s.memberRow}>
                      <Avatar name={u.displayName} image={u.avatarUrl} presence={u.presence} showPresence size={36} />
                      <div className={s.info}>
                        <Text weight="semibold" truncate wrap={false}>
                          {u.displayName}{isMe ? " (you)" : ""}
                        </Text>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} truncate wrap={false}>
                          @{u.username} {isAdmin ? <span className={s.adminTag}>· admin</span> : null}
                        </Text>
                      </div>
                      {meIsAdmin && !isMe ? (
                        <Menu>
                          <MenuTrigger disableButtonEnhancement>
                            <Button aria-label={`Manage ${u.displayName}`} appearance="subtle" icon={<MoreVerticalRegular />} />
                          </MenuTrigger>
                          <MenuPopover>
                            <MenuList>
                              {isAdmin ? (
                                <MenuItem
                                  icon={<ShieldDismissRegular />}
                                  onClick={async () => { await chatService.demoteAdmin(conversation.id, id); toast.show({ title: "Removed as admin", intent: "info" }); }}
                                >
                                  Remove as admin
                                </MenuItem>
                              ) : (
                                <MenuItem
                                  icon={<ShieldPersonRegular />}
                                  onClick={async () => { await chatService.promoteAdmin(conversation.id, id); toast.show({ title: "Promoted to admin", intent: "success" }); }}
                                >
                                  Make admin
                                </MenuItem>
                              )}
                              <MenuItem icon={<PersonSubtractRegular />} onClick={() => setConfirmRemove(id)}>
                                Remove from group
                              </MenuItem>
                            </MenuList>
                          </MenuPopover>
                        </Menu>
                      ) : null}
                    </div>
                  );
                })}
              </>
            ) : null}

            {tab === "media" ? (
              !attachments ? (
                <div style={{ display: "grid", placeItems: "center", padding: tokens.spacingVerticalXL }}>
                  <Spinner size="tiny" label="Loading…" />
                </div>
              ) : attachments.length === 0 ? (
                <div style={{ textAlign: "center", padding: tokens.spacingVerticalXL, color: tokens.colorNeutralForeground3 }}>
                  <ImageRegular fontSize={32} />
                  <div style={{ marginTop: 8 }}>Nothing shared here yet.</div>
                </div>
              ) : (
                <>
                  {images.length > 0 ? (
                    <>
                      <Text weight="semibold">Images</Text>
                      <div className={s.mediaGrid}>
                        {images.map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={a.name} className={s.mediaThumb} />
                          </a>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {docs.length > 0 ? (
                    <>
                      <Text weight="semibold" style={{ marginTop: tokens.spacingVerticalM }}>Files</Text>
                      {docs.map((a) => (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={s.fileRow}>
                          <DocumentRegular /> {a.name}
                        </a>
                      ))}
                    </>
                  ) : null}
                </>
              )
            ) : null}
          </div>
        </DrawerBody>
      </Drawer>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this group?"
        description="You'll stop receiving messages and won't see the history."
        confirmLabel="Leave"
        destructive
        onConfirm={leave}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this conversation?"
        description="The conversation and its messages will be removed from your account."
        confirmLabel="Delete"
        destructive
        onConfirm={deleteConv}
      />
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Remove this member?"
        description="They will no longer see new messages in this group."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!confirmRemove) return;
          await chatService.removeMember(conversation.id, confirmRemove);
          toast.show({ title: "Member removed", intent: "info" });
          setConfirmRemove(null);
        }}
      />
      <ConfirmDialog
        open={!!confirmBlock}
        onOpenChange={(o) => !o && setConfirmBlock(null)}
        title={confirmBlock ? `Block ${confirmBlock.displayName}?` : "Block user?"}
        description="You won't receive messages from them anymore. You can unblock later in Settings."
        confirmLabel="Block"
        destructive
        onConfirm={async () => {
          if (!confirmBlock) return;
          await authService.blockUser(confirmBlock.id);
          toast.show({ title: `Blocked ${confirmBlock.displayName}`, intent: "info" });
          setConfirmBlock(null);
        }}
      />
    </>
  );
}
