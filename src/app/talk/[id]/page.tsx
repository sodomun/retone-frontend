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
  updateChatLastAiMessage,
  Message,
  Chat,
} from "@/lib/chat";
import { getSettings, UserSettings } from "@/lib/settings";
import { adjustMessage } from "@/lib/ai";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  // チャット画面を開いた時点の readBy[myUid]（markAsRead で上書きされる前の値）
  const [initialReadAtMs, setInitialReadAtMs] = useState<number | null>(null);
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
    return subscribeToChatData(chatId, (chatData) => {
      // 初回のみ readBy[myUid] を保存する。
      // markAsRead が書き込む前の値が「既読済みの基準時刻」になる。
      setInitialReadAtMs((prev) => {
        if (prev === null) {
          return chatData?.readBy?.[user.uid]?.toMillis() ?? 0;
        }
        return prev;
      });
      setChat(chatData);
    });
  }, [user, chatId]);

  // AI処理: 未読かつ aiTexts[myUid] が未生成のメッセージのみ処理する
  useEffect(() => {
    if (!user || !chatId || !settings?.aiEnabled || initialReadAtMs === null) return;

    const unprocessed = messages.filter(
      (msg) =>
        msg.senderUid !== user.uid &&
        !msg.aiTexts[user.uid] &&
        !processingRef.current.has(msg.id) &&
        // 未読判定: 画面を開いた時点の既読タイムスタンプより新しいメッセージのみ
        (msg.createdAt?.getTime() ?? 0) > initialReadAtMs
    );

    if (unprocessed.length === 0) return;

    // messages は createdAt 昇順なので、最後の要素がチャットの最新メッセージ
    const lastUnprocessedId = unprocessed[unprocessed.length - 1].id;

    unprocessed.forEach((msg) => {
      processingRef.current.add(msg.id);
      adjustMessage(msg.text, settings.systemPrompt)
        .then((aiText) => {
          if (!aiText) return;
          updateMessageAiText(chatId, msg.id, user.uid, aiText);
          // 最新メッセージなら一覧プレビュー用の lastAiMessages も更新する
          if (msg.id === lastUnprocessedId) {
            updateChatLastAiMessage(chatId, user.uid, aiText);
          }
        })
        .finally(() => {
          processingRef.current.delete(msg.id);
        });
    });
  }, [messages, settings, user, chatId, initialReadAtMs]);

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

  const headerTitle = isGroup
    ? (chat?.name ?? "グループ")
    : (chat?.memberNames?.[partnerUid] ?? chatId);

  /**
   * 表示するテキストを決定する。
   * null を返した場合はメッセージを非表示にする（未読 & AI処理待ち）。
   */
  const getDisplayText = (msg: Message): string | null => {
    if (msg.senderUid === user.uid) return msg.text;
    if (!settings?.aiEnabled) return msg.text;

    const aiText = msg.aiTexts[user.uid];
    if (aiText) return aiText;

    // 未読メッセージかつ AI 未処理 → 秘匿のため非表示
    const msgTime = msg.createdAt?.getTime() ?? 0;
    if (msgTime > (initialReadAtMs ?? 0)) return null;

    // 既読済みで AI 未処理（処理対象外）→ 原文を表示
    return msg.text;
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
        {messages.map((msg) => {
          const displayText = getDisplayText(msg);
          if (displayText === null) return null;
          return (
            <MessageBubble
              key={msg.id}
              text={displayText}
              isMine={msg.senderUid === user.uid}
              createdAt={msg.createdAt}
              readCount={getReadCount(msg)}
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
