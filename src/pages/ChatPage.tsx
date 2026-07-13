import {
  Button,
  Drawer,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip,
  makeStyles,
  tokens,
  Text,
} from "@fluentui/react-components";
import {
  ChatMultipleRegular,
  NavigationRegular,
  SignOutRegular,
  EditRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/Avatar";
import { ConversationSidebar } from "@/features/chat/ConversationSidebar";
import { ChatHeader } from "@/features/chat/ChatHeader";
import { MessageTimeline } from "@/features/chat/MessageTimeline";
import { Composer } from "@/features/chat/Composer";
import { NewConversationDialog } from "@/features/chat/NewConversationDialog";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/providers/AuthProvider";
import { chatService } from "@/services";
import type { Message } from "@/services/types";

const useStyles = makeStyles({
  root: {
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  layout: {
    flex: 1,
    display: "grid",
    minHeight: 0,
    gridTemplateColumns: "320px 1fr",
    "@media (max-width: 768px)": { gridTemplateColumns: "1fr" },
  },
  mainCol: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0,
  },
  emptyState: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    padding: tokens.spacingHorizontalXXL,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
  emptyIcon: {
    width: "56px", height: "56px",
    borderRadius: tokens.borderRadiusCircular,
    display: "grid", placeItems: "center",
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    margin: "0 auto",
  },
  topbar: {
    display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (min-width: 769px)": { display: "none" },
  },
  brand: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, fontWeight: tokens.fontWeightSemibold },
  brandMark: {
    width: "24px", height: "24px",
    borderRadius: tokens.borderRadiusMedium,
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorPaletteBerryBackground2})`,
  },
  userBar: {
    padding: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  userInfo: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
});

export default function ChatPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const params = useParams<{ conversationId?: string }>();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user, signOut } = useAuth();

  const { conversations, loading: convLoading } = useConversations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const activeId = params.conversationId;
  const active = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);

  const { messages, loading, loadingMore, hasMore, loadMore, send, retry, removeLocal } =
    useMessages(activeId);

  useEffect(() => {
    if (activeId) chatService.markRead(activeId);
    setReplyTo(null);
  }, [activeId]);

  function selectConversation(id: string) {
    navigate(`/chat/${id}`);
    if (isMobile) setDrawerOpen(false);
  }

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        loading={convLoading}
        onSelect={selectConversation}
        onNew={() => setNewOpen(true)}
        onClose={isMobile ? () => setDrawerOpen(false) : undefined}
      />
      {user ? (
        <div className={s.userBar}>
          <Avatar name={user.displayName} image={user.avatarUrl} presence={user.presence} showPresence size={32} />
          <div className={s.userInfo}>
            <Text weight="semibold" truncate wrap={false}>{user.displayName}</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} truncate wrap={false}>@{user.username}</Text>
          </div>
          <ThemeToggle />
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Account" relationship="label">
                <Button aria-label="Account menu" appearance="subtle" icon={<NavigationRegular />} />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<SignOutRegular />} onClick={() => { signOut(); navigate("/"); }}>
                  Sign out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={s.root}>
      <OfflineBanner />
      {isMobile ? (
        <div className={s.topbar}>
          <Button aria-label="Open conversations" appearance="subtle" icon={<NavigationRegular />} onClick={() => setDrawerOpen(true)} />
          <div className={s.brand}><span className={s.brandMark} /> Pulse</div>
          <div style={{ marginLeft: "auto" }}>
            <Tooltip content="New conversation" relationship="label">
              <Button aria-label="New conversation" appearance="subtle" icon={<EditRegular />} onClick={() => setNewOpen(true)} />
            </Tooltip>
          </div>
        </div>
      ) : null}

      <div className={s.layout}>
        {isMobile ? (
          <Drawer
            open={drawerOpen}
            onOpenChange={(_, d) => setDrawerOpen(d.open)}
            type="overlay"
            position="start"
            style={{ width: "min(340px, 90vw)" }}
          >
            {sidebar}
          </Drawer>
        ) : (
          sidebar
        )}

        <div className={s.mainCol}>
          {active ? (
            <>
              <ChatHeader
                conversation={active}
                onBack={isMobile ? () => setDrawerOpen(true) : undefined}
              />
              <MessageTimeline
                messages={messages}
                loading={loading}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
                onReply={setReplyTo}
                onRetry={retry}
                onDiscard={removeLocal}
                typingUserIds={active.typingUserIds}
              />
              <Composer
                onSend={send}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
              />
            </>
          ) : (
            <div className={s.emptyState}>
              <div>
                <div className={s.emptyIcon}><ChatMultipleRegular fontSize={28} /></div>
                <div style={{ marginTop: 12 }}>
                  <Text size={500} weight="semibold" style={{ color: tokens.colorNeutralForeground1 }}>
                    Select a conversation
                  </Text>
                </div>
                <div style={{ marginTop: 4 }}>Or start a new one from the sidebar.</div>
                <div style={{ marginTop: 16 }}>
                  <Button appearance="primary" onClick={() => setNewOpen(true)} icon={<EditRegular />}>
                    New conversation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => navigate(`/chat/${id}`)}
      />
    </div>
  );
}
