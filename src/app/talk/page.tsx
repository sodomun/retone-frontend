"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToFriends, FriendData } from "@/lib/friends";
import { getChatId } from "@/lib/chat";
import TalkHeader from "@/components/talk/TalkHeader";
import FriendListItem from "@/components/user/FriendListItem";
import Footer from "@/components/common/Footer";

export default function TalkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendData[]>([]);
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
    const unsubscribe = subscribeToFriends(user.uid, (data) => {
      setFriends(data);
    });
    return () => unsubscribe();
  }, [user]);

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
      <TalkHeader />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {friends.length === 0 ? (
          <p style={{ color: "var(--subtext-color)", marginTop: 24, textAlign: "center" }}>
            友達がいません。友達追加ボタンから追加してください。
          </p>
        ) : (
          friends.map((f) => (
            <FriendListItem
              key={f.uid}
              uid={f.uid}
              displayName={f.displayName}
              chatId={getChatId(user.uid, f.uid)}
              myUid={user.uid}
              onClick={() => router.push(`/talk/${f.uid}`)}
            />
          ))
        )}
      </div>
      <Footer />
    </div>
  );
}
