import { useEffect, useState } from "react";
import { subscribeToChatData, Chat } from "@/lib/chat";

/**
 * チャットドキュメントをリアルタイム購読するフック。
 * メンバー情報・既読状況・グループ名などが含まれる。
 *
 * initialReadAtMs: 前回このチャット画面を開いたときの既読タイムスタンプ。
 *   markAsRead で上書きされる前に1回だけ保存する。
 *   これより新しいメッセージ = 今回初めて受信した未読メッセージ、として扱う。
 *
 * - loading: 初回チャットデータ取得が完了するまで true
 */
export function useChatData(chatId: string, userId: string | undefined) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [initialReadAtMs, setInitialReadAtMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !chatId) return;
    return subscribeToChatData(chatId, (chatData) => {
      // 初回のみ readBy[myUid] を保存する。
      // markAsRead が書き込む前の値が「既読済みの基準時刻」になる。
      setInitialReadAtMs((prev) => {
        if (prev === null) {
          return chatData?.readBy?.[userId]?.toMillis() ?? 0;
        }
        return prev; // 2回目以降は上書きしない
      });
      setChat(chatData);
      setLoading(false);
    });
  }, [userId, chatId]);

  return { chat, initialReadAtMs, loading };
}
