import { useCallback, useEffect, useRef, useState } from "react";
import { chatService } from "@/services";
import type { Attachment, Message } from "@/services/types";

const PAGE = 30;

export function useMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeId = useRef<string | undefined>(conversationId);

  const load = useCallback(async () => {
    if (!conversationId) return;
    activeId.current = conversationId;
    setLoading(true);
    setError(null);
    try {
      const page = await chatService.getMessages(conversationId, { limit: PAGE });
      if (activeId.current !== conversationId) return;
      setMessages(page.items);
      setHasMore(page.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    if (!conversationId) return;
    const unsub = chatService.subscribe(async () => {
      const page = await chatService.getMessages(conversationId, { limit: PAGE });
      if (activeId.current !== conversationId) return;
      setMessages(page.items);
      setHasMore(page.hasMore);
    });
    return () => {
      unsub();
    };
  }, [conversationId, load]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const page = await chatService.getMessages(conversationId, {
        before: messages[0].id,
        limit: PAGE,
      });
      setMessages((prev) => [...page.items, ...prev]);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, messages]);

  const send = useCallback(
    async (input: { body: string; replyToId?: string; attachments?: Attachment[] }) => {
      if (!conversationId) return;
      const clientId = "tmp_" + Math.random().toString(36).slice(2);
      const optimistic: Message = {
        id: clientId,
        conversationId,
        authorId: "u_me",
        body: input.body,
        createdAt: new Date().toISOString(),
        attachments: input.attachments ?? [],
        reactions: [],
        status: "sending",
        replyToId: input.replyToId,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        await chatService.sendMessage({ ...input, conversationId, clientId });
        // service will emit and refresh
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === clientId ? { ...m, status: "failed" } : m)),
        );
      }
    },
    [conversationId],
  );

  const retry = useCallback(
    async (messageId: string) => {
      const m = messages.find((x) => x.id === messageId);
      if (!m || !conversationId) return;
      setMessages((prev) => prev.map((x) => (x.id === messageId ? { ...x, status: "sending" } : x)));
      try {
        await chatService.sendMessage({
          conversationId,
          body: m.body,
          replyToId: m.replyToId,
          attachments: m.attachments,
          clientId: messageId,
        });
      } catch (e) {
        setMessages((prev) => prev.map((x) => (x.id === messageId ? { ...x, status: "failed" } : x)));
      }
    },
    [messages, conversationId],
  );

  const removeLocal = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return { messages, loading, loadingMore, hasMore, error, loadMore, send, retry, removeLocal };
}
