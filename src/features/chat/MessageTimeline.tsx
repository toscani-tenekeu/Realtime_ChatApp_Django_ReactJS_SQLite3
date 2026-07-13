import { makeStyles, tokens, Text, Spinner, Button } from "@fluentui/react-components";
import { useEffect, useRef } from "react";
import type { Message } from "@/services/types";
import { MessageTimelineSkeleton } from "@/components/Skeletons";
import { formatDayLabel, isSameDay } from "@/utils/date";
import { MessageBubble } from "@/features/chat/MessageBubble";
import { getUser } from "@/features/chat/helpers";

const useStyles = makeStyles({
  root: {
    flex: 1,
    overflowY: "auto",
    padding: `${tokens.spacingVerticalM} 0`,
    display: "flex",
    flexDirection: "column",
  },
  centered: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    padding: tokens.spacingHorizontalXXL,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
  daySep: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
  },
  line: { flex: 1, height: "1px", backgroundColor: tokens.colorNeutralStroke2 },
  loadMoreWrap: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalM },
  typing: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontStyle: "italic",
  },
});

interface Props {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onReply: (m: Message) => void;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onForward: (m: Message) => void;
  typingUserIds: string[];
}

export function MessageTimeline({
  messages,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onReply,
  onRetry,
  onDiscard,
  onForward,
  typingUserIds,
}: Props) {
  const s = useStyles();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > lastLenRef.current;
    lastLenRef.current = messages.length;
    if (grew) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (loading) return <MessageTimelineSkeleton />;

  if (messages.length === 0) {
    return (
      <div className={s.centered}>
        <div>
          <Text size={400} weight="semibold">
            No messages yet
          </Text>
          <div style={{ marginTop: 4 }}>Say hi to start the conversation.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root} ref={scrollRef} data-testid="message-timeline">
      {hasMore ? (
        <div className={s.loadMoreWrap}>
          {loadingMore ? (
            <Spinner size="tiny" label="Loading older messages…" />
          ) : (
            <Button appearance="subtle" size="small" onClick={onLoadMore}>
              Load older messages
            </Button>
          )}
        </div>
      ) : null}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const dayChange = !prev || !isSameDay(prev.createdAt, m.createdAt);
        const showAvatar =
          !prev ||
          prev.authorId !== m.authorId ||
          Date.parse(m.createdAt) - Date.parse(prev.createdAt) > 5 * 60_000;
        return (
          <div key={m.id}>
            {dayChange ? (
              <div className={s.daySep}>
                <div className={s.line} />
                <span>{formatDayLabel(m.createdAt)}</span>
                <div className={s.line} />
              </div>
            ) : null}
            <MessageBubble
              message={m}
              showAvatar={showAvatar}
              onReply={onReply}
              onRetry={onRetry}
              onDiscard={onDiscard}
              onForward={onForward}
            />
          </div>
        );
      })}
      {typingUserIds.length > 0 ? (
        <div className={s.typing} aria-live="polite">
          {typingUserIds.map((id) => getUser(id)?.displayName ?? "Someone").join(", ")} typing…
        </div>
      ) : null}
    </div>
  );
}
