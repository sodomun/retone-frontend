"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = credential.user;

      await setDoc(doc(db, "users", uid), {
        uid,
        displayName,
        createdAt: Timestamp.now(),
      });

      router.push("/talk");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "サインアップに失敗しました");
    }
  };

  return (
    <div>
      <h1>サインアップ</h1>
      <form onSubmit={handleSignup}>
        <div>
          <label>表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">登録</button>
      </form>
      <p>
        アカウントをお持ちの方は <a href="/login">ログイン</a>
      </p>
    </div>
  );
}
