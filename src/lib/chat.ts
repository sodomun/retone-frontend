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
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Message = {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
};

export type Chat = {
  type?: "direct" | "group";
  members?: string[];
  memberNames?: Record<string, string>;
  name?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  readBy?: Record<string, Timestamp>;
};

export type ChatWithId = Chat & { id: string };

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

/**
 * 自分が参加している全チャット（1:1 + グループ）を lastMessageAt 降順で購読する。
 * ※ Firestore コンソールで members + lastMessageAt の複合インデックスが必要。
 *   初回実行時にコンソールのエラーリンクから自動作成できる。
 */
export function subscribeToChats(
  uid: string,
  callback: (chats: ChatWithId[]) => void
): () => void {
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const chats: ChatWithId[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data({ serverTimestamps: "estimate" }) as Chat),
    }));
    callback(chats);
  });
}

/** グループチャットを作成し、chatId を返す */
export async function createGroupChat(
  members: string[],
  memberNames: Record<string, string>,
  groupName: string
): Promise<string> {
  const ref = await addDoc(collection(db, "chats"), {
    type: "group",
    members,
    memberNames,
    name: groupName,
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
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
