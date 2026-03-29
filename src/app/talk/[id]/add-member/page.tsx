"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useChatData } from "@/hooks/useChatData";
import { useFriends } from "@/hooks/useFriends";
import { useChats } from "@/hooks/useChats";
import { addMembersToGroup, getChatId } from "@/lib/chat";
import FriendListItem from "@/components/user/FriendListItem";

export default function AddMemberPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useRequireAuth();
  const { chat, loading } = useChatData(chatId, user?.uid);
  const { friends } = useFriends(user?.uid);
  const { chats } = useChats(user?.uid);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleSelect = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!user || selectedUids.size === 0) return;
    setSubmitting(true);
    const newUids = Array.from(selectedUids);
    const newMemberNames: Record<string, string> = {};
    friends.forEach((f) => {
      if (selectedUids.has(f.uid)) newMemberNames[f.uid] = f.displayName;
    });
    await addMembersToGroup(chatId, newUids, newMemberNames);
    router.replace(`/talk/${chatId}`);
  };

  if (loading || !user) return <p>読み込み中...</p>;

  const groupMembers = chat?.members ?? [];
  const eligibleFriends = friends
    .filter((f) => !groupMembers.includes(f.uid))
    .map((f) => {
      const directChat = chats.find((c) => c.id === getChatId(user.uid, f.uid)) ?? null;
      return { ...f, directChat };
    })
    .sort((a, b) => {
      const aMs = a.directChat?.lastMessageAt?.toMillis() ?? 0;
      const bMs = b.directChat?.lastMessageAt?.toMillis() ?? 0;
      return bMs - aMs;
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
          onClick={() => router.push(`/talk/${chatId}/profile`)}
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
          メンバーを追加
          {selectedUids.size > 0 && (
            <span style={{ color: "#0084ff", marginLeft: 6 }}>({selectedUids.size}人)</span>
          )}
        </span>
        <button
          onClick={handleAdd}
          disabled={selectedUids.size === 0 || submitting}
          style={{
            background: "none",
            border: "none",
            cursor: selectedUids.size > 0 && !submitting ? "pointer" : "default",
            fontSize: 15,
            color: selectedUids.size > 0 && !submitting ? "#0084ff" : "var(--subtext-color)",
            fontWeight: "bold",
            padding: 0,
          }}
        >
          {submitting ? "追加中..." : "追加"}
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {eligibleFriends.length === 0 ? (
          <p style={{ color: "var(--subtext-color)", marginTop: 24, textAlign: "center" }}>
            追加できる友達がいません。
          </p>
        ) : (
          eligibleFriends.map(({ uid, displayName, directChat }) => {
            const selected = selectedUids.has(uid);
            return (
              <div
                key={uid}
                onClick={() => toggleSelect(uid)}
                style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <FriendListItem
                    displayName={displayName}
                    myUid={user.uid}
                    chat={directChat}
                  />
                </div>
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
                    marginLeft: 8,
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
