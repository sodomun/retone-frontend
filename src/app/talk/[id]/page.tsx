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
  updateMessageAiText,
  Message,
  Chat,
} from "@/lib/chat";
import { getSettings, UserSettings } from "@/lib/settings";
import { adjustMessage } from "@/lib/ai";
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
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  // AI処理中のメッセージIDを追跡して重複呼び出しを防ぐ
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        setLoading(false);
      } else {
        setUser(currentUser);
        getSettings(currentUser.uid).then(setSettings);
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

  // AI処理: 受信メッセージのうち aiTexts[myUid] が未生成のものを処理する
  useEffect(() => {
    if (!user || !chatId || !settings?.aiEnabled) return;

    const unprocessed = messages.filter(
      (msg) =>
        msg.senderUid !== user.uid &&
        !msg.aiTexts[user.uid] &&
        !processingRef.current.has(msg.id)
    );

    unprocessed.forEach((msg) => {
      processingRef.current.add(msg.id);
      adjustMessage(msg.text, settings.systemPrompt)
        .then((aiText) => {
          if (aiText) {
            updateMessageAiText(chatId, msg.id, user.uid, aiText);
          }
        })
        .finally(() => {
          processingRef.current.delete(msg.id);
        });
    });
  }, [messages, settings, user, chatId]);

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

  // 1:1チャットの場合のみ相手の既読タイムスタンプを取得
  const partnerUid = !isGroup
    ? (chat?.members?.find((uid) => uid !== user.uid) ?? "")
    : "";
  const partnerReadAtMs = !isGroup
    ? (chat?.readBy?.[partnerUid]?.toMillis() ?? 0)
    : 0;

  const getReadCount = (msg: Message): number => {
    if (msg.senderUid !== user.uid) return 0;

    if (!isGroup) {
      return partnerReadAtMs > 0 &&
        (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
        ? 1 : 0;
    }

    const msgTimeMs = msg.createdAt?.getTime();
    if (msgTimeMs == null) return 0;

    return (chat?.members ?? [])
      .filter((uid) => uid !== user.uid)
      .filter((uid) => {
        const readAtMs = chat?.readBy?.[uid]?.toMillis();
        return readAtMs != null && readAtMs >= msgTimeMs;
      }).length;
  };

  // ヘッダーに表示する名前
  const headerTitle = isGroup
    ? (chat?.name ?? "グループ")
    : (chat?.memberNames?.[partnerUid] ?? chatId);

  // 送信者は元テキスト、受信者はAI調整済みテキスト（なければ元テキスト）を表示する
  const getDisplayText = (msg: Message): string => {
    if (msg.senderUid === user.uid) return msg.text;
    if (!settings?.aiEnabled) return msg.text;
    return msg.aiTexts[user.uid] ?? msg.text;
  };

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
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={getDisplayText(msg)}
            isMine={msg.senderUid === user.uid}
            createdAt={msg.createdAt}
            readCount={getReadCount(msg)}
            isGroup={isGroup}
            // memberNames からメッセージ送信者の名前を取得（グループでは送信者ごとに異なる）
            displayName={chat?.memberNames?.[msg.senderUid] ?? ""}
            isAiAdjusted={
              msg.senderUid !== user.uid &&
              !!settings?.aiEnabled &&
              !!msg.aiTexts[user.uid]
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
