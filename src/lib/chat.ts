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
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserSettings } from "@/lib/settings";

export type Message = {
  id: string;
  senderUid: string;
  text: string;
  aiTexts: Record<string, string>;
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
  lastAiMessages?: Record<string, string>;
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

/** 既存グループに新メンバーを追加する */
export async function addMembersToGroup(
  chatId: string,
  newUids: string[],
  newMemberNames: Record<string, string>
): Promise<void> {
  const namesUpdate = Object.fromEntries(
    newUids.map((uid) => [`memberNames.${uid}`, newMemberNames[uid]])
  );
  await updateDoc(doc(db, "chats", chatId), {
    members: arrayUnion(...newUids),
    ...namesUpdate,
  });
}

/** チャットドキュメントの lastAiMessages に受信者ごとのAI調整済みテキストを書き込む */
export async function updateChatLastAiMessage(
  chatId: string,
  uid: string,
  aiText: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`lastAiMessages.${uid}`]: aiText,
  });
}

/** AI調整済みテキストをメッセージドキュメントの aiTexts に書き込む */
export async function updateMessageAiText(
  chatId: string,
  messageId: string,
  uid: string,
  aiText: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    [`aiTexts.${uid}`]: aiText,
  });
}

/**
 * 自分が送信したメッセージの既読人数を返す。
 * 自分以外のメッセージは 0 を返す。
 */
export function getReadCount(
  msg: Message,
  userId: string,
  isGroup: boolean,
  chat: Chat | null,
  partnerReadAtMs: number
): number {
  if (msg.senderUid !== userId) return 0;

  if (!isGroup) {
    // 1:1チャット: 相手が既読済みなら1、未読なら0
    return partnerReadAtMs > 0 &&
      (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
      ? 1
      : 0;
  }

  // グループチャット: 自分以外のメンバーのうち既読済みの人数を返す
  const msgTimeMs = msg.createdAt?.getTime();
  if (msgTimeMs == null) return 0;

  return (chat?.members ?? [])
    .filter((uid) => uid !== userId)
    .filter((uid) => {
      const readAtMs = chat?.readBy?.[uid]?.toMillis();
      return readAtMs != null && readAtMs >= msgTimeMs;
    }).length;
}

/**
 * メッセージに表示するテキストを決定する。
 * null を返した場合はメッセージを非表示にする（未読 & AI処理待ち）。
 *
 * 判定フロー:
 *   1. 自分の発言          → 原文
 *   2. AI無効              → 原文
 *   3. AI処理済み          → AIテキスト
 *   4. 未読 & AI未処理     → null（秘匿のため非表示）
 *   5. 既読済み & AI未処理 → 原文（既に見ているので見せてOK）
 */
export function getDisplayText(
  msg: Message,
  userId: string,
  settings: UserSettings | null,
  initialReadAtMs: number | null
): string | null {
  if (msg.senderUid === userId) return msg.text;
  if (!settings?.aiEnabled) return msg.text;

  const aiText = msg.aiTexts[userId];
  if (aiText) return aiText;

  const msgTime = msg.createdAt?.getTime() ?? 0;
  if (msgTime > (initialReadAtMs ?? 0)) return null;

  return msg.text;
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
        aiTexts: data.aiTexts ?? {},
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
      };
    });
    callback(messages);
  });
}
