import {
  doc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  deleteField,
  getDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getChatId } from "@/lib/chat";

/** 友達を両方向で削除し、ダイレクトチャット（メッセージ含む）も削除する */
export async function deleteFriend(
  myUid: string,
  friendUid: string
): Promise<void> {
  const chatId = getChatId(myUid, friendUid);

  // メッセージを全件取得（サブコレクションは親削除では消えないため）
  const messagesSnap = await getDocs(
    collection(db, "chats", chatId, "messages")
  );

  const batch = writeBatch(db);
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "chats", chatId));
  batch.delete(doc(db, "users", myUid, "friends", friendUid));
  batch.delete(doc(db, "users", friendUid, "friends", myUid));
  await batch.commit();
}

/** グループを退会する（残りメンバーが0になったらグループ自体を削除） */
export async function leaveGroup(
  chatId: string,
  myUid: string
): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) return;

  const members: string[] = snap.data().members ?? [];
  const remaining = members.filter((uid) => uid !== myUid);

  if (remaining.length === 0) {
    await deleteDoc(chatRef);
  } else {
    await updateDoc(chatRef, {
      members: arrayRemove(myUid),
      [`memberNames.${myUid}`]: deleteField(),
    });
  }
}
