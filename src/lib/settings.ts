import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserSettings = {
  uid: string;
  aiEnabled: boolean;
  systemPrompt: string;
  updatedAt: Timestamp;
};

export const DEFAULT_SYSTEM_PROMPT =
  "以下のメッセージを、元の意図・内容を保ちながら、言葉のトゲや冷たい印象を取り除き、穏やかで受け取りやすい表現に書き直してください。書き直した文章のみを返してください。";

export async function getSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, "settings", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
}

export async function updateSettings(
  uid: string,
  data: Pick<UserSettings, "aiEnabled" | "systemPrompt">
): Promise<void> {
  await setDoc(
    doc(db, "settings", uid),
    { uid, ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
