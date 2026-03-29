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
  // 前回このチャット画面を開いたときの既読タイムスタンプ（= readBy[myUid]）。
  // markAsRead が Firestore を上書きする前に1回だけ保存し、
  // 「今回の未読メッセージ」と「以前に既読済みのメッセージ」を区別するために使う。
  const [initialReadAtMs, setInitialReadAtMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // メッセージが更新されたら最下部へスクロールするためのアンカー
  const bottomRef = useRef<HTMLDivElement>(null);
  // AI処理中のメッセージIDを管理して重複呼び出しを防ぐ。
  // useState にすると値変更のたびに再レンダーが走り AI処理の useEffect が再発火してしまうため、
  // 再レンダーを起こさない useRef を使う。
  const processingRef = useRef<Set<string>>(new Set()); // Set = 重複なしの文字列集合

  // ---------------------------------------------------------------
  // useEffect(処理, [依存配列]) : 依存配列の値が変わるたびに処理が発火する。
  // return で返した関数はクリーンアップ処理として、
  // コンポーネントが破棄されるとき（画面遷移など）に呼ばれる。
  // ---------------------------------------------------------------

  // [] = マウント時に1回だけ発火。ログイン状態の監視を開始する。
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
    // 画面を離れたらログイン状態の監視を停止する
    return () => unsubscribe();
  }, [router]);

  // user または chatId が確定したとき、メッセージのリアルタイム購読を開始する。
  // onSnapshot により Firestore に変化があるたび setMessages が呼ばれ画面が自動更新される。
  useEffect(() => {
    if (!user || !chatId) return;
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markAsRead(chatId, user.uid);
    });
    // 画面を離れたら購読を停止する（リソースリーク防止）
    return () => unsubscribe();
  }, [user, chatId]);

  // user または chatId が確定したとき、チャット情報のリアルタイム購読を開始する。
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

  // messages が更新されるたびに発火し、未読かつ AI未処理のメッセージを AI処理する。
  // （settings / user / chatId / initialReadAtMs は実質変化しないが、
  //   useEffect 内で参照しているため依存配列に含める必要がある）
  useEffect(() => {
    if (!user || !chatId || !settings?.aiEnabled || initialReadAtMs === null) return;

    const unprocessed = messages.filter(
      (msg) =>
        msg.senderUid !== user.uid &&
        !msg.aiTexts[user.uid] && // aiTexts は { uid: AIテキスト } の辞書。自分のUID でルックアップ。
        !processingRef.current.has(msg.id) && // 既に処理中なら除外（重複リクエスト防止）
        // initialReadAtMs より新しい = 今回初めて受信した未読メッセージのみ対象
        (msg.createdAt?.getTime() ?? 0) > initialReadAtMs
    );

    if (unprocessed.length === 0) return;

    // messages は createdAt 昇順なので、最後の要素がチャットの最新メッセージ
    const lastUnprocessedId = unprocessed[unprocessed.length - 1].id;

    unprocessed.forEach((msg) => {
      processingRef.current.add(msg.id); // 処理開始 → 追跡セットに追加
      adjustMessage(msg.text, settings.systemPrompt)
        .then((aiText) => {
          if (!aiText) return;
          // Firestore のメッセージドキュメントに aiTexts[uid] を書き込む
          updateMessageAiText(chatId, msg.id, user.uid, aiText);
          // 最新メッセージなら一覧プレビュー用の lastAiMessages も更新する
          if (msg.id === lastUnprocessedId) {
            updateChatLastAiMessage(chatId, user.uid, aiText);
          }
        })
        .finally(() => {
          processingRef.current.delete(msg.id); // 処理完了 → 追跡セットから削除
        });
    });
  }, [messages, settings, user, chatId, initialReadAtMs]);

  // messages が更新されるたびに最下部へスクロールする
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

  // 1:1チャットの場合のみ相手の UID を取得する（グループは空文字）
  const partnerUid = !isGroup
    ? (chat?.members?.find((uid) => uid !== user.uid) ?? "")
    : "";

  // 1:1チャットの場合のみ相手の最終既読タイムスタンプを取得する
  const partnerReadAtMs = !isGroup
    ? (chat?.readBy?.[partnerUid]?.toMillis() ?? 0)
    : 0;

  // メッセージの既読人数を返す（自分が送信したメッセージにのみ使用）
  const getReadCount = (msg: Message): number => {
    if (msg.senderUid !== user.uid) return 0;

    if (!isGroup) {
      // 1:1チャット: 相手が既読済みなら1、未読なら0
      return partnerReadAtMs > 0 &&
        (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
        ? 1 : 0;
    }

    const msgTimeMs = msg.createdAt?.getTime();
    if (msgTimeMs == null) return 0;

    // グループチャット: 自分以外のメンバーのうち既読済みの人数を返す
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
   * メッセージに表示するテキストを決定する。
   * null を返した場合はメッセージを非表示にする（未読 & AI処理待ち）。
   *
   * 判定フロー:
   *   1. 自分の発言          → 原文
   *   2. AI無効              → 原文
   *   3. AI処理済み          → AIテキスト
   *   4. 未読 & AI未処理     → null（秘匿のため非表示）
   *   5. 既読済み & AI未処理 → 原文（既に見ているので見せてOK）
   */
  const getDisplayText = (msg: Message): string | null => {
    if (msg.senderUid === user.uid) return msg.text;
    if (!settings?.aiEnabled) return msg.text;

    // aiTexts は { uid: AIテキスト } の辞書。自分の UID をキーに取り出す。
    const aiText = msg.aiTexts[user.uid];
    if (aiText) return aiText;

    // initialReadAtMs より新しい = 今回初めて受信した未読メッセージ → AI処理完了まで非表示
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
          // null = 未読 & AI処理待ち → 表示しない
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
        {/* このdivを最下部アンカーとして使い、新着メッセージ時にスクロールする */}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
