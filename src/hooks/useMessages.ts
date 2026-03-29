import { useEffect, useState } from "react";
import { subscribeToMessages, markAsRead, Message } from "@/lib/chat";

/**
 * メッセージをリアルタイム購読するフック。
 * Firestoreに変化があるたびに messages が更新される。
 * メッセージ取得のたびに markAsRead も呼んで既読を更新する。
 *
 * - loading: 初回メッセージ取得が完了するまで true
 */
export function useMessages(chatId: string, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // userId が確定するまで購読しない（認証前に実行されるのを防ぐ）
    if (!userId || !chatId) return;
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // メッセージを受信するたびに既読タイムスタンプを更新する
      markAsRead(chatId, userId);
    });
    // 画面を離れたら購読を停止する（リソースリーク防止）
    return () => unsubscribe();
  }, [userId, chatId]);

  return { messages, loading };
}
