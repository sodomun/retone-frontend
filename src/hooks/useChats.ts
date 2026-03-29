import { useEffect, useState } from "react";
import { subscribeToChats, ChatWithId } from "@/lib/chat";

/**
 * 自分が参加しているチャット一覧をリアルタイム購読するフック。
 * lastMessageAt 降順で返される（最新のトークが先頭）。
 * Firestoreに変化があるたびに chats が更新される。
 */
export function useChats(userId: string | undefined) {
  const [chats, setChats] = useState<ChatWithId[]>([]);

  useEffect(() => {
    if (!userId) return;
    // 購読開始。戻り値は購読停止関数。
    return subscribeToChats(userId, setChats);
  }, [userId]);

  return { chats };
}
