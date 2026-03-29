import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserProfile = {
  uid: string;
  displayName: string;
  createdAt: Date | null;
};

/** Firestoreからユーザープロフィールを取得する */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: data.uid,
    displayName: data.displayName ?? "",
    createdAt: data.createdAt?.toDate() ?? null,
  };
}

/** Firestoreからユーザーの表示名のみ取得する */
export async function getUserDisplayName(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return "";
  return snap.data().displayName ?? "";
}
