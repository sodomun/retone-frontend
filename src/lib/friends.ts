import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getChatId } from "@/lib/chat";

export type FriendData = {
  uid: string;
  displayName: string;
  addedAt: Date | null;
};

/** uidでユーザーを検索する */
export async function searchUserByUid(uid: string): Promise<FriendData | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid: data.uid, displayName: data.displayName, addedAt: null };
}

/** 友達を両方向で登録する */
export async function addFriend(
  currentUid: string,
  friendUid: string,
  friendDisplayName: string,
  currentDisplayName: string
): Promise<void> {
  const now = serverTimestamp();

  const chatId = getChatId(currentUid, friendUid);

  await Promise.all([
    // 自分 → 相手. 自分のdb中の, users/{currentUid}/friends/{friendUid}{...}を書き込んでいる.
    setDoc(doc(db, "users", currentUid, "friends", friendUid), {
      uid: friendUid,
      displayName: friendDisplayName,
      addedAt: now,
    }),
    // 相手 → 自分. 自分のdb中の, users/{friendUid}/friends/{currentUid}{...}を書き込んでいる.
    setDoc(doc(db, "users", friendUid, "friends", currentUid), {
      uid: currentUid,
      displayName: currentDisplayName,
      addedAt: now,
    }),
    // チャットドキュメントを事前作成。lastMessageAt を友達追加時刻で初期化することで
    // まだメッセージがない友達も talk/page.tsx でソートできるようにする。
    // merge: true により既存のチャット履歴がある場合は上書きしない。
    setDoc(
      doc(db, "chats", chatId),
      {
        type: "direct",
        members: [currentUid, friendUid],
        memberNames: { [currentUid]: currentDisplayName, [friendUid]: friendDisplayName },
        lastMessageAt: now,
      },
      { merge: true }
    ),
  ]);
}

/** 友達一覧をリアルタイム取得する。unsubscribe関数を返す */
export function subscribeToFriends(
  uid: string,
  callback: (friends: FriendData[]) => void
): () => void {
  const friendsRef = collection(db, "users", uid, "friends");
  return onSnapshot(friendsRef, (snapshot) => { // データの変更を監視する.
    const friends: FriendData[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid,
        displayName: data.displayName,
        addedAt: data.addedAt?.toDate() ?? null,
      };
    });
    callback(friends); // 後で実行される関数を渡す仕組み. friendsデータが取れた瞬間に, subscribeToFriendsに引数を渡す.
  });
}
