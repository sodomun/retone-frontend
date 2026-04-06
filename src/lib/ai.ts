/**
 * メッセージ本文を Gemini Flash 2.5 で調整する。
 * /api/adjust-message をプロキシとして経由するため、API キーはサーバー側にのみ存在する。
 * 失敗した場合は null を返す（呼び出し元で元の text にフォールバックする）。
 */
export async function adjustMessage(
  text: string,
  systemPrompt: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/adjust-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, systemPrompt }),
    });
    const data = await res.json();
    return data.aiText ?? null;
  } catch (e) {
    console.error("AI調整エラー:", e);
    return null;
  }
}
// ダミー
