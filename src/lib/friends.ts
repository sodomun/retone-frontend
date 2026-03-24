import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  await Promise.all([
    // 自分 → 相手
    setDoc(doc(db, "users", currentUid, "friends", friendUid), {
      uid: friendUid,
      displayName: friendDisplayName,
      addedAt: now,
    }),
    // 相手 → 自分
    setDoc(doc(db, "users", friendUid, "friends", currentUid), {
      uid: currentUid,
      displayName: currentDisplayName,
      addedAt: now,
    }),
  ]);
}

/** 友達一覧をリアルタイム取得する。unsubscribe関数を返す */
export function subscribeToFriends(
  uid: string,
  callback: (friends: FriendData[]) => void
): () => void {
  const friendsRef = collection(db, "users", uid, "friends");
  return onSnapshot(friendsRef, (snapshot) => {
    const friends: FriendData[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid,
        displayName: data.displayName,
        addedAt: data.addedAt?.toDate() ?? null,
      };
    });
    callback(friends);
  });
}
