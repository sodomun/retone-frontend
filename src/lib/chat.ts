import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Message = {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
};

/** 2人のuidからチャットIDを生成する（常に同じIDになるようソート） */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

/** メッセージを送信する */
export async function sendMessage(
  chatId: string,
  senderUid: string,
  text: string
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderUid,
    text,
    createdAt: serverTimestamp(),
  });
}

/** メッセージをリアルタイム取得する。unsubscribe関数を返す */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): () => void {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        senderUid: data.senderUid,
        text: data.text,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
      };
    });
    callback(messages);
  });
}
