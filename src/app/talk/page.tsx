"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useChats } from "@/hooks/useChats";
import TalkHeader from "@/components/talk/TalkHeader";
import FriendListItem from "@/components/user/FriendListItem";
import Footer from "@/components/common/Footer";

export default function TalkPage() {
  const router = useRouter();
  const { user, settings, loading } = useAuth();
  const { chats } = useChats(user?.uid);

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  const aiEnabled = settings?.aiEnabled ?? false;

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
                aiEnabled={aiEnabled}
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
