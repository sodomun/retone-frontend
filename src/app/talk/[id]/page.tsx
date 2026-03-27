"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  sendMessage,
  subscribeToMessages,
  subscribeToChatData,
  markAsRead,
  Message,
  Chat,
} from "@/lib/chat";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";

export default function ChatPage() {
  // URLパラメータは 1:1・グループ共通で chatId
  const { id: chatId } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        setLoading(false);
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user || !chatId) return;
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markAsRead(chatId, user.uid);
    });
    return () => unsubscribe();
  }, [user, chatId]);

  useEffect(() => {
    if (!user || !chatId) return;
    return subscribeToChatData(chatId, setChat);
  }, [user, chatId]);

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

  // 1:1チャットの場合のみ既読情報を計算
  const partnerUid = !isGroup
    ? (chat?.members?.find((uid) => uid !== user.uid) ?? "")
    : "";
  const partnerReadAtMs = !isGroup
    ? (chat?.readBy?.[partnerUid]?.toMillis() ?? 0)
    : 0;

  // ヘッダーに表示する名前
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
      <ChatHeader displayName={headerTitle} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            isMine={msg.senderUid === user.uid}
            createdAt={msg.createdAt}
            isRead={
              !isGroup &&
              msg.senderUid === user.uid &&
              partnerReadAtMs > 0 &&
              (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
            }
            // memberNames からメッセージ送信者の名前を取得（グループでは送信者ごとに異なる）
            displayName={chat?.memberNames?.[msg.senderUid] ?? ""}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
