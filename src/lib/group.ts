import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
