"use client";

import { useEffect, useState } from "react";
import ProfileAvatar from "@/components/user/ProfileAvatar";
import { subscribeToChatData, Chat } from "@/lib/chat";

type Props = {
  displayName: string;
  uid: string;
  chatId: string;
  myUid: string;
  onClick?: () => void;
};

export default function FriendListItem({ displayName, chatId, myUid, onClick }: Props) {
  const [chat, setChat] = useState<Chat | null>(null);

  useEffect(() => {
    return subscribeToChatData(chatId, setChat);
  }, [chatId]);

  const isUnread = (() => {
    if (!chat?.lastMessageAt) return false;
    const readAtMs = chat.readBy?.[myUid]?.toMillis() ?? 0;
    return chat.lastMessageAt.toMillis() > readAtMs;
  })();

  const lastMessageText = chat?.lastMessage ?? "メッセージがありません。";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid #eee",
      }}
    >
      <ProfileAvatar displayName={displayName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: isUnread ? "bold" : "normal" }}>
          {displayName}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: isUnread ? "#000" : "#888",
            fontWeight: isUnread ? "bold" : "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lastMessageText}
        </p>
      </div>
      {isUnread && (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#0084ff",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
