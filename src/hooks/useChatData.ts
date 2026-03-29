import { useEffect, useRef, useState } from "react";
import { subscribeToChatData, Chat } from "@/lib/chat";

/**
 * チャットドキュメントをリアルタイム購読するフック。
 * メンバー情報・既読状況・グループ名などが含まれる。
 *
 * initialReadAtMs: 前回このチャット画面を開いたときの既読タイムスタンプ。
 *   markAsRead で上書きされる前に1回だけ保存する。
 *   これより新しいメッセージ = 今回初めて受信した未読メッセージ、として扱う。
 *
 * unsubscribe: 購読を手動で停止する関数。
 *   友達削除・グループ退会など、Firestoreドキュメントを削除する直前に呼ぶことで
 *   削除イベントをリスナーが拾ってセキュリティルールエラーになるのを防げる。
 *
 * - loading: 初回チャットデータ取得が完了するまで true
 */
export function useChatData(chatId: string, userId: string | undefined) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [initialReadAtMs, setInitialReadAtMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // 購読停止関数を外部から呼べるように ref で保持する
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !chatId) return;
    const unsub = subscribeToChatData(chatId, (chatData) => {
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
    unsubscribeRef.current = unsub;
    return unsub;
  }, [userId, chatId]);

  const unsubscribe = () => {
    unsubscribeRef.current?.();
  };

  return { chat, initialReadAtMs, loading, unsubscribe };
}
