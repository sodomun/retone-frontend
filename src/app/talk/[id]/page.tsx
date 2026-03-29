"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { sendMessage, getReadCount, getDisplayText } from "@/lib/chat";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useChatData } from "@/hooks/useChatData";
import { useAiProcessing } from "@/hooks/useAiProcessing";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const { user, settings, loading } = useAuth();
  const { messages } = useMessages(chatId, user?.uid);
  const { chat, initialReadAtMs } = useChatData(chatId, user?.uid);
  const bottomRef = useRef<HTMLDivElement>(null);

  useAiProcessing(messages, settings, user?.uid, chatId, initialReadAtMs);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!user || !chatId) return;
    await sendMessage(chatId, user.uid, text);
  };

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  const isGroup = chat?.type === "group";
  const partnerUid = !isGroup
    ? (chat?.members?.find((uid) => uid !== user.uid) ?? "")
    : "";
  const partnerReadAtMs = !isGroup
    ? (chat?.readBy?.[partnerUid]?.toMillis() ?? 0)
    : 0;
  const headerTitle = isGroup
    ? (chat?.name ?? "グループ")
    : (chat?.memberNames?.[partnerUid] ?? chatId);

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
      <ChatHeader displayName={headerTitle} chatId={chatId} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {messages.map((msg) => {
          const displayText = getDisplayText(msg, user.uid, settings, initialReadAtMs);
          if (displayText === null) return null;
          return (
            <MessageBubble
              key={msg.id}
              text={displayText}
              isMine={msg.senderUid === user.uid}
              createdAt={msg.createdAt}
              readCount={getReadCount(msg, user.uid, isGroup, chat, partnerReadAtMs)}
              isGroup={isGroup}
              displayName={chat?.memberNames?.[msg.senderUid] ?? ""}
              isAiAdjusted={
                msg.senderUid !== user.uid &&
                !!settings?.aiEnabled &&
                !!msg.aiTexts[user.uid]
              }
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
