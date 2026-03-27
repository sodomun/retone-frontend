"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToChats, ChatWithId } from "@/lib/chat";
import TalkHeader from "@/components/talk/TalkHeader";
import FriendListItem from "@/components/user/FriendListItem";
import Footer from "@/components/common/Footer";

export default function TalkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatWithId[]>([]);
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

  // 自分が参加している全チャットを lastMessageAt 降順で購読
  useEffect(() => {
    if (!user) return;
    return subscribeToChats(user.uid, setChats);
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
        {chats.length === 0 ? (
          <p style={{ color: "var(--subtext-color)", marginTop: 24, textAlign: "center" }}>
            トークがありません。友達追加ボタンから始めましょう。
          </p>
        ) : (
          chats.map((chat) => {
            const isGroup = chat.type === "group";
            const partnerUid = !isGroup
              ? (chat.members?.find((uid) => uid !== user.uid) ?? "")
              : "";
            const displayName = isGroup
              ? (chat.name ?? "グループ")
              : (chat.memberNames?.[partnerUid] ?? "不明");

            return (
              <FriendListItem
                key={chat.id}
                displayName={displayName}
                myUid={user.uid}
                chat={chat}
                isGroup={isGroup}
                onClick={() => router.push(`/talk/${chat.id}`)}
              />
            );
          })
        )}
      </div>
      <Footer />
    </div>
  );
}
