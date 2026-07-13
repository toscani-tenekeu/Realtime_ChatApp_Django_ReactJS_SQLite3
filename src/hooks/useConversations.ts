import { useEffect, useState, useCallback } from "react";
import { chatService } from "@/services";
import type { Conversation } from "@/services/types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await chatService.listConversations();
    setConversations(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = chatService.subscribe(() => {
      refresh();
    });
    return () => {
      unsub();
    };
  }, [refresh]);

  return { conversations, loading, refresh };
}
