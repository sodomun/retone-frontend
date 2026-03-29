import { useEffect, useState } from "react";
import { subscribeToFriends, FriendData } from "@/lib/friends";

/**
 * 友達一覧をリアルタイム購読するフック。
 * Firestoreに変化があるたびに friends が更新される。
 * （友達追加・削除が即座に反映される）
 */
export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<FriendData[]>([]);

  useEffect(() => {
    if (!userId) return;
    // 購読開始。戻り値は購読停止関数。
    return subscribeToFriends(userId, setFriends);
  }, [userId]);

  return { friends };
}
