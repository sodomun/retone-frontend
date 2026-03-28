# AI 機能設計

## コンセプト

ReTone の AI 機能は「受信者視点」で設計されている。

送信されたメッセージの言葉のトゲや冷たい印象を、**受信者自身の設定に基づいて**調整し、送り手の本来の意図を正しく受け取れるようにする。送信者は自分のメッセージをそのまま見る。受信者だけが、自分好みに調整されたテキストを受け取る。

```
送信者 ── text ──────────────────→ Firestore
                                        ↓
受信者 ← aiTexts[receiverUid] ← AI処理（受信者が開いたとき）
```

---

## Gemini Flash 2.5

モデル: `gemini-2.5-flash`
SDK: `@firebase/ai`（Firebase AI SDK、すでに `package.json` に含まれる）

### なぜ Gemini Flash 2.5 を選ぶのか

- Firebase プロジェクトと統合しやすい（`@firebase/ai` で直接呼び出せる）
- Flash モデルは高速・低コストで、1メッセージを都度処理するユースケースに適している

---

## lib/ai.ts

Gemini Flash 2.5 への API 呼び出しを担う。

### 関数

#### `adjustMessage(text: string, systemPrompt: string): Promise<string>`

メッセージ本文を AI で調整し、調整後のテキストを返す。

```typescript
// 呼び出し例
const aiText = await adjustMessage(
  "なんでそんなこともわかんないの",
  "以下のメッセージを、元の意図・内容を保ちながら、言葉のトゲや冷たい印象を取り除き、穏やかで受け取りやすい表現に書き直してください。書き直した文章のみを返してください。"
);
// → "少し確認させてほしいのですが、この部分はどういう意味でしょうか？"
```

### エラーハンドリング

AI 呼び出しが失敗した場合（ネットワークエラー、API エラーなど）は例外をキャッチし、`null` を返す。呼び出し元では `null` の場合に元の `text` を表示する。

---

## lib/settings.ts

`settings/{uid}` コレクションの CRUD を担う。

### 型

```typescript
type UserSettings = {
  uid: string;
  aiEnabled: boolean;
  systemPrompt: string;
  updatedAt: Timestamp;
};
```

### デフォルト systemPrompt

```
以下のメッセージを、元の意図・内容を保ちながら、
言葉のトゲや冷たい印象を取り除き、
穏やかで受け取りやすい表現に書き直してください。
書き直した文章のみを返してください。
```

### 関数

#### `getSettings(uid: string): Promise<UserSettings | null>`

`settings/{uid}` を取得する。ドキュメントが存在しない（未設定ユーザー）場合は `null` を返す。

#### `updateSettings(uid: string, data: Partial<UserSettings>): Promise<void>`

`settings/{uid}` を更新する。ドキュメントが存在しない場合は作成する（`setDoc` + `merge: true`）。

---

## AI 処理フロー（チャット画面）

```
受信者がチャット画面（/talk/[chatId]）を開く
          ↓
getSettings(myUid) で AI 設定を取得
          ↓
aiEnabled: false → 処理なし。通常の text を表示
          ↓
aiEnabled: true
          ↓
subscribeToMessages で取得したメッセージをループ
          ↓
自分が送信者のメッセージ（senderUid === myUid）→ スキップ
          ↓
msg.aiTexts[myUid] が存在する → 生成済み。スキップ
          ↓
msg.aiTexts[myUid] が存在しない
          ↓
adjustMessage(msg.text, systemPrompt) → Gemini Flash 2.5 で調整
          ↓
updateMessageAiText(chatId, msg.id, myUid, aiText) → Firestore に書き込み
          ↓
（subscribeToMessages がリアルタイムで更新を受け取り、画面に反映）
```

### updateMessageAiText

```typescript
// chats/{chatId}/messages/{messageId} の aiTexts.{uid} を更新
await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
  [`aiTexts.${uid}`]: aiText,
});
```

`updateDoc` のドット記法で `aiTexts` マップの特定 UID のみを更新する。他の UID の aiText は上書きされない。

---

## 処理の非同期性とUX

AI 処理は非同期でバックグラウンド実行される。

- チャット画面を開いた直後は `text` が表示される
- AI 処理完了後、`subscribeToMessages` がリアルタイムで更新を検知し、`aiTexts[myUid]` が揃い次第 UI が自動更新される
- 受信者はメッセージが届いた瞬間ではなく、「チャットを開いたとき」に AI 処理が走る

### 一度生成したら再生成しない

`aiTexts[myUid]` がすでに存在するメッセージは処理をスキップする。これにより：
- 同じメッセージに対して API が何度も呼ばれない（コスト削減）
- 設定を変更しても過去メッセージには影響しない

---

## 設定 UI（settings/page.tsx 内）

```
AI 設定
──────────────────────────────
AI テキスト調整          [トグル]

調整スタイル（systemPrompt）
┌────────────────────────────┐
│ 以下のメッセージを、元の意 │
│ 図・内容を保ちながら...    │
└────────────────────────────┘
                      [保存する]
```

- トグルが OFF の場合、テキストエリアはグレーアウトして編集不可にする
- 「保存する」ボタンで `updateSettings()` を呼び出す
- 設定が未作成（`getSettings` が `null` を返す）の場合は、デフォルト値をフォームに表示する

---

## 実装フェーズ

### Phase 1 — Settings 基盤
- `lib/settings.ts` 実装（`getSettings` / `updateSettings`）
- `settings/page.tsx` に AI 設定セクション追加
- Firestore Security Rules に `settings/{uid}` を追加

### Phase 2 — AI API 接続 & メッセージ処理
- `lib/ai.ts` 実装（`adjustMessage`）
- `lib/chat.ts` に `updateMessageAiText` を追加
- `src/lib/chat.ts` の `Message` 型に `aiTexts` を追加
- `talk/[id]/page.tsx` に AI 処理ロジックを組み込む

### Phase 3 — UI 反映 & 体験改善
- `MessageBubble` に `isAiAdjusted` props を追加してインジケーター表示
- AI 処理中のローディング表示（スケルトン or スピナー）
- エラー時のフォールバック（AI 失敗時は `text` をそのまま表示）
