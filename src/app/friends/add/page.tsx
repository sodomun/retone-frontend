"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { searchUserByUid, addFriend } from "@/lib/friends";
import AddFriendItem from "@/components/user/AddFriendItem";

type SearchResult = {
  uid: string;
  displayName: string;
};

export default function AddFriendPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace("/login");
      else setUser(u);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    const found = await searchUserByUid(query.trim());
    if (found) {
      setResult({ uid: found.uid, displayName: found.displayName });
    } else {
      setNotFound(true);
    }
    setSearching(false);
  }

  async function handleAdd() {
    if (!user || !result) return;
    if (result.uid === user.uid) return;
    setAdding(true);

    // 自分のdisplayNameをFirestoreから取得
    const mySnap = await getDoc(doc(db, "users", user.uid));
    const myDisplayName = mySnap.exists()
      ? (mySnap.data().displayName as string)
      : (user.displayName ?? "Unknown");

    await addFriend(user.uid, result.uid, result.displayName, myDisplayName);
    setAdding(false);
    router.push("/talk");
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <button onClick={() => router.back()} style={{ marginBottom: 12 }}>
        戻る
      </button>
      <h2>友達追加</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="ユーザーIDを入力"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
        />
        <button onClick={handleSearch} disabled={searching}>
          {searching ? "検索中..." : "検索"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {notFound && <p style={{ color: "#888" }}>ユーザーが見つかりませんでした。</p>}
        {result && (
          <AddFriendItem
            uid={result.uid}
            displayName={result.displayName}
            onAdd={handleAdd}
            adding={adding}
          />
        )}
      </div>
    </div>
  );
}
