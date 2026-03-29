import { useEffect, useRef } from "react";
import { Message, updateMessageAiText, updateChatLastAiMessage } from "@/lib/chat";
import { UserSettings } from "@/lib/settings";
import { adjustMessage } from "@/lib/ai";

/**
 * 未読メッセージをAI処理するフック。
 * messages が更新されるたびに発火し、未処理のメッセージに adjustMessage を呼ぶ。
 * 戻り値はなく、副作用（Firestoreへの書き込み）のみを担う。
 *
 * 処理対象の条件:
 *   - 自分以外が送信したメッセージ
 *   - aiTexts[userId] が未生成
 *   - initialReadAtMs より新しい（= 今回初めて受信した未読メッセージ）
 *   - 現在AI処理中でない（重複リクエスト防止）
 */
export function useAiProcessing(
  messages: Message[],
  settings: UserSettings | null,
  userId: string | undefined,
  chatId: string,
  initialReadAtMs: number | null
) {
  // AI処理中のメッセージIDを管理して重複呼び出しを防ぐ。
  // useState にすると値変更のたびに再レンダーが走り useEffect が再発火するため、
  // 再レンダーを起こさない useRef を使う。
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !chatId || !settings?.aiEnabled || initialReadAtMs === null) return;

    // 処理対象のメッセージを絞り込む
    const unprocessed = messages.filter(
      (msg) =>
        msg.senderUid !== userId &&
        !msg.aiTexts[userId] && // aiTexts は { uid: AIテキスト } の辞書
        !processingRef.current.has(msg.id) && // 処理中なら除外
        (msg.createdAt?.getTime() ?? 0) > initialReadAtMs // 未読のみ対象
    );

    if (unprocessed.length === 0) return;

    // messages は createdAt 昇順なので、最後の要素がチャットの最新メッセージ
    const lastUnprocessedId = unprocessed[unprocessed.length - 1].id;

    unprocessed.forEach((msg) => {
      processingRef.current.add(msg.id); // 処理開始 → 追跡セットに追加
      adjustMessage(msg.text, settings.systemPrompt)
        .then((aiText) => {
          if (!aiText) return;
          // Firestoreのメッセージドキュメントに aiTexts[userId] を書き込む
          updateMessageAiText(chatId, msg.id, userId, aiText);
          // 最新メッセージなら一覧プレビュー用の lastAiMessages も更新する
          if (msg.id === lastUnprocessedId) {
            updateChatLastAiMessage(chatId, userId, aiText);
          }
        })
        .finally(() => {
          processingRef.current.delete(msg.id); // 処理完了 → 追跡セットから削除
        });
    });
  }, [messages, settings, userId, chatId, initialReadAtMs]);
}
