import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Message = {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
};

export type Chat = {
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  readBy?: Record<string, Timestamp>;
};

/** 2人のuidからチャットIDを生成する（常に同じIDになるようソート） */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

/** メッセージを送信し、chats/{chatId} の lastMessage も更新する */
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

  // ドキュメント未作成の場合も考慮して setDoc + merge
  await setDoc(
    doc(db, "chats", chatId),
    {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: senderUid,
    },
    { merge: true }
  );
}

/** チャット画面に入った時点で既読とする */
export async function markAsRead(chatId: string, uid: string): Promise<void> {
  await updateDoc(
    doc(db, "chats", chatId),
    { [`readBy.${uid}`]: serverTimestamp() }
  );
}

/** chats/{chatId} ドキュメントをリアルタイム購読する */
export function subscribeToChatData(
  chatId: string,
  callback: (chat: Chat | null) => void
): () => void {
  return onSnapshot(doc(db, "chats", chatId), (snap) => {
    callback(snap.exists() ? (snap.data({ serverTimestamps: "estimate" }) as Chat) : null);
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
