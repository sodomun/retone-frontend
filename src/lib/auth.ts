import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/** メールアドレスとパスワードでログインする */
export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

/** 新規アカウントを作成し、Firestoreにユーザードキュメントを保存する */
export async function signupUser(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  await setDoc(doc(db, "users", uid), {
    uid,
    displayName,
    createdAt: Timestamp.now(),
  });
}
