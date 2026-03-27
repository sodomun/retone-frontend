"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToFriends, FriendData } from "@/lib/friends";
import ProfileAvatar from "@/components/user/ProfileAvatar";

export default function NewGroupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    return subscribeToFriends(user.uid, setFriends);
  }, [user]);

  const toggleSelect = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleNext = () => {
    const members = Array.from(selectedUids).join(",");
    router.push(`/talk/new-group/profile?members=${members}`);
  };

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--header-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "var(--foreground)",
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="戻る"
        >
          ←
        </button>
        <span style={{ fontWeight: "bold", fontSize: 16 }}>
          メンバーを選択
          {selectedUids.size > 0 && (
            <span style={{ color: "#0084ff", marginLeft: 6 }}>
              ({selectedUids.size}人)
            </span>
          )}
        </span>
        <button
          onClick={handleNext}
          disabled={selectedUids.size === 0}
          style={{
            background: "none",
            border: "none",
            cursor: selectedUids.size > 0 ? "pointer" : "default",
            fontSize: 15,
            color: selectedUids.size > 0 ? "#0084ff" : "var(--subtext-color)",
            fontWeight: "bold",
            padding: 0,
          }}
        >
          次へ
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {friends.length === 0 ? (
          <p style={{ color: "var(--subtext-color)", marginTop: 24, textAlign: "center" }}>
            友達がいません。
          </p>
        ) : (
          friends.map((f) => {
            const selected = selectedUids.has(f.uid);
            return (
              <div
                key={f.uid}
                onClick={() => toggleSelect(f.uid)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <ProfileAvatar displayName={f.displayName} />
                <span style={{ flex: 1, fontSize: 15 }}>{f.displayName}</span>
                {/* 選択チェックマーク */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: selected ? "none" : "2px solid var(--input-border)",
                    background: selected ? "#0084ff" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {selected && (
                    <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
