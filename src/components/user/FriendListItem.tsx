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
    console.log("chat:", chat);
    console.log("myUid:", myUid);
    console.log("readBy:", chat?.readBy);
    console.log("readBy[myUid]:", chat?.readBy?.[myUid]);
    if (!chat?.lastMessageAt) return false;
    const readAtMs = chat.readBy?.[myUid]?.toMillis() ?? 0;
    console.log("lastMessageAt ms:", chat.lastMessageAt.toMillis());
    console.log("readAtMs:", readAtMs);
    return chat.lastMessageAt.toMillis() > readAtMs;
  })();

  const lastMessageText = chat?.lastMessage ?? "メッセージがありません。";

  const lastMessageTimeStr = (() => {
    if (!chat?.lastMessageAt) return "";
    const date = chat.lastMessageAt.toDate();
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) {
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
    if (isYesterday) return "昨日";
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  })();

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <ProfileAvatar displayName={displayName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontWeight: isUnread ? "bold" : "normal" }}>
            {displayName}
          </p>
          <span style={{ fontSize: 11, color: "var(--timestamp-color)", flexShrink: 0 }}>
            {lastMessageTimeStr}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: isUnread ? "var(--unread-text)" : "var(--subtext-color)",
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
