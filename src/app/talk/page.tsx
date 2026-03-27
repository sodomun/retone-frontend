"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToFriends, FriendData } from "@/lib/friends";
import { getChatId, subscribeToChatData, Chat } from "@/lib/chat";
import TalkHeader from "@/components/talk/TalkHeader";
import FriendListItem from "@/components/user/FriendListItem";
import Footer from "@/components/common/Footer";

export default function TalkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [chatDataMap, setChatDataMap] = useState<Record<string, Chat | null>>({});
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

  // 全友達のチャットデータを購読。友達リストが変わるたびに再購読する。
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const unsubscribers = friends.map((f) => {
      const chatId = getChatId(user.uid, f.uid);
      return subscribeToChatData(chatId, (chat) => {
        setChatDataMap((prev) => ({ ...prev, [chatId]: chat }));
      });
    });
    return () => unsubscribers.forEach((u) => u());
  }, [user, friends]);

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  // lastMessageAt の降順でソート（新しいチャットが上に来る）
  const sortedFriends = [...friends].sort((a, b) => {
    const timeA = chatDataMap[getChatId(user.uid, a.uid)]?.lastMessageAt?.toMillis() ?? 0;
    const timeB = chatDataMap[getChatId(user.uid, b.uid)]?.lastMessageAt?.toMillis() ?? 0;
    return timeB - timeA;
  });

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
        {sortedFriends.length === 0 ? (
          <p style={{ color: "var(--subtext-color)", marginTop: 24, textAlign: "center" }}>
            友達がいません。友達追加ボタンから追加してください。
          </p>
        ) : (
          sortedFriends.map((f) => {
            const chatId = getChatId(user.uid, f.uid);
            return (
              <FriendListItem
                key={f.uid}
                uid={f.uid}
                displayName={f.displayName}
                chatId={chatId}
                myUid={user.uid}
                chat={chatDataMap[chatId] ?? null}
                onClick={() => router.push(`/talk/${f.uid}`)}
              />
            );
          })
        )}
      </div>
      <Footer />
    </div>
  );
}
