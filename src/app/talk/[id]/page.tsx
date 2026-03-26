"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getChatId,
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
  const { id: partnerUid } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [partnerName, setPartnerName] = useState("");
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

  // 相手のdisplayNameを取得
  useEffect(() => {
    if (!partnerUid) return;
    getDoc(doc(db, "users", partnerUid)).then((snap) => {
      if (snap.exists()) {
        setPartnerName(snap.data().displayName ?? partnerUid);
      }
    });
  }, [partnerUid]);

  // メッセージをリアルタイム取得 & 既読処理
  useEffect(() => {
    if (!user || !partnerUid) return;
    const chatId = getChatId(user.uid, partnerUid);
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markAsRead(chatId, user.uid);
    });
    return () => unsubscribe();
  }, [user, partnerUid]);

  // チャットデータ購読
  useEffect(() => {
    if (!user || !partnerUid) return;
    const chatId = getChatId(user.uid, partnerUid);
    const unsubscribe = subscribeToChatData(chatId, setChat);
    return () => unsubscribe();
  }, [user, partnerUid]);

  // 新しいメッセージが来たら最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!user || !partnerUid) return;
    const chatId = getChatId(user.uid, partnerUid);
    await sendMessage(chatId, user.uid, text);
  };

  if (loading) return <p>読み込み中...</p>;
  if (!user) return null;

  // 相手が既読にした最後の自分のメッセージIDを特定
  const partnerReadAtMs = chat?.readBy?.[partnerUid]?.toMillis() ?? 0;
  const lastReadMsgId = (() => {
    if (!partnerReadAtMs) return null;
    const myReadMessages = messages.filter(
      (m) =>
        m.senderUid === user.uid &&
        (m.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
    );
    return myReadMessages.at(-1)?.id ?? null;
  })();

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      <ChatHeader displayName={partnerName || partnerUid} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            isMine={msg.senderUid === user.uid}
            createdAt={msg.createdAt}
            isRead={msg.id === lastReadMsgId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
