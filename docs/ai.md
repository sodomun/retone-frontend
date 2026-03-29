# AI 機能設計

## コンセプト

ReTone の AI 機能は「受信者視点」で設計されている。

送信されたメッセージの言葉のトゲや冷たい印象を、**受信者自身の設定に基づいて**調整し、送り手の本来の意図を正しく受け取れるようにする。送信者は自分のメッセージをそのまま見る。受信者だけが、自分好みに調整されたテキストを受け取る。

```
送信者 ── text ──────────────────→ Firestore
                                        ↓
受信者 ← aiTexts[receiverUid] ← AI処理（受信者がチャットを開いたとき）
```

---

## Gemini Flash 2.5

モデル: `gemini-2.5-flash`
API: Gemini Developer API（Google AI Studio）

### API キーの管理

API キーはクライアントコードに置かず、サーバー側にのみ存在する。

```
クライアント（ブラウザ）
    ↓ fetch("/api/adjust-message")
Next.js API ルート（サーバー側）← API キーはここだけ
    ↓
Gemini API
```

- **ローカル開発**: `.env.local` の `GEMINI_API_KEY` を参照
- **本番**: Firebase Functions の環境変数として設定

### なぜ Gemini Flash 2.5 を選ぶのか

Flash モデルは高速・低コストで、1メッセージを都度処理するユースケースに適している。

---

## lib/ai.ts

`/api/adjust-message` を経由して Gemini Flash 2.5 を呼び出す。

### 関数

#### `adjustMessage(text: string, systemPrompt: string): Promise<string | null>`

メッセージ本文を AI で調整し、調整後のテキストを返す。失敗した場合は `null` を返す（呼び出し元で元の `text` にフォールバックする）。

```typescript
const aiText = await adjustMessage(
  "なんでそんなこともわかんないの",
  "以下のメッセージを、元の意図・内容を保ちながら..."
);
// → "少し確認させてほしいのですが、この部分はどういう意味でしょうか？"
// → null（API エラー時）
```

---

## app/api/adjust-message/route.ts

サーバー側で Gemini API を呼び出す Next.js API ルート。

```
POST /api/adjust-message
Body: { text: string, systemPrompt: string }
Response: { aiText: string | null }
```

API キーを `process.env.GEMINI_API_KEY` から読み取り、Gemini REST API を直接呼び出す。クライアントに API キーが渡ることはない。

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

## aiText 生成フロー（チャット画面）

AI 処理のロジックは `hooks/useAiProcessing.ts` に分離されている。`talk/[id]/page.tsx` は `useAiProcessing(messages, settings, user?.uid, chatId, initialReadAtMs)` を呼ぶだけで、副作用（Gemini API 呼び出し・Firestore 書き込み）はフック内で完結する。

### 前提：未読メッセージのみ処理する

全メッセージを処理すると API コストが高くなる。また、過去に生成した aiText を設定変更で上書きしてしまう問題も生じる。そのため **未読メッセージのみ** を処理対象とする。

未読の判定基準は「チャット画面を開いた時点の `readBy[myUid]`」。`markAsRead` で上書きされる前の値を `initialReadAtMs` として保存し、`msg.createdAt > initialReadAtMs` を満たすメッセージのみ処理する。

### initialReadAtMs の取得タイミング

```
① subscribeToChatData が初回発火
      ↓
   initialReadAtMs = readBy[myUid] の値（markAsRead 前）を保存
      ↓
② subscribeToMessages が発火 → markAsRead を呼ぶ
   （readBy[myUid] が「今」に上書きされるが、初回値は保存済み）
```

`initialReadAtMs` は state で管理し、初回のみ値をセットする（2回目以降は上書きしない）。これにより、AI 処理 useEffect の依存配列に含めることができ、chat data の到着後に確実に処理が走る。

### 処理フロー

```
チャット画面を開く
      ↓
initialReadAtMs が確定する（subscribeToChatData 初回コールバック）
      ↓
AI 処理 useEffect が発火
  条件: aiEnabled == true かつ initialReadAtMs が確定済み
      ↓
以下の条件を全て満たすメッセージを抽出：
  ・senderUid !== myUid（相手のメッセージ）
  ・aiTexts[myUid] が未生成
  ・現在 AI 処理中でない（processingRef に ID がない）
  ・msg.createdAt > initialReadAtMs（未読）
      ↓
該当メッセージごとに（並行処理）：
  adjustMessage(msg.text, systemPrompt)
    → /api/adjust-message → Gemini Flash 2.5 → aiText
      ↓
  updateMessageAiText(chatId, msgId, myUid, aiText)
    → messages/{messageId}.aiTexts.{myUid} に書き込み
      ↓
  最新メッセージなら:
    updateChatLastAiMessage(chatId, myUid, aiText)
      → chats/{chatId}.lastAiMessages.{myUid} に書き込み
      ↓
subscribeToMessages が Firestore の更新を検知
  → messages が更新 → UI が自動再描画
```

### 一度生成したら再生成しない

`aiTexts[myUid]` がすでに存在するメッセージは処理をスキップする。これにより：
- 同じメッセージに API が複数回呼ばれない（コスト削減）
- 設定変更しても過去メッセージのAIテキストは保持される

---

## 表示ロジック（getDisplayText）

チャット画面でどのテキストを表示するかを決定する関数。

```
自分のメッセージ
  → text（原文）を表示

相手のメッセージ & AI 無効
  → text（原文）を表示

相手のメッセージ & AI 有効 & aiTexts[myUid] あり
  → aiText を表示（✦ インジケーター付き）

相手のメッセージ & AI 有効 & aiTexts[myUid] なし
  ├─ msg.createdAt > initialReadAtMs（未読・AI処理待ち）
  │    → null を返す → MessageBubble を非表示（原文を秘匿）
  └─ msg.createdAt <= initialReadAtMs（既読済み・処理対象外）
       → text（原文）を表示
```

### なぜ未読・未処理のメッセージを非表示にするのか

AI 処理が完了する前に原文が一瞬表示されてしまうと、アプリのコンセプト（言葉のトゲを受け取らせない）が崩れる。未読メッセージは AI 処理が完了してから初めて表示することで、受信者が原文を目にする機会をなくす。

---

## チャット一覧の表示ロジック（FriendListItem）

```
AI 無効 または 自分が最後に送信
  → lastMessage（原文）を表示

AI 有効 かつ 相手が最後に送信
  ├─ lastAiMessages[myUid] あり → AI 調整済みテキストを表示
  └─ lastAiMessages[myUid] なし → ""（空欄）を表示
       ※ チャットを一度も開いていない場合（AI 未処理）は原文を秘匿する
```

`lastAiMessages` はチャット画面を開いて AI 処理が完了した後に初めて書き込まれる。それまでは一覧のプレビューが空欄になる。

---

## タイムライン（未読メッセージが届いたとき）

```
相手がメッセージ送信
    ↓
chats/{chatId}.lastMessage = 原文（Firestore に書き込み）
    ↓
チャット一覧（FriendListItem）
  → lastAiMessages[myUid] なし → プレビュー空欄 + 未読ドット表示
    ↓
自分がチャット画面を開く
    ↓
initialReadAtMs を保存（画面を開く前の readBy[myUid]）
markAsRead を呼ぶ（readBy[myUid] が「今」に更新）
    ↓
AI 処理 useEffect が発火
  未読メッセージを検出（msg.createdAt > initialReadAtMs）
  → getDisplayText が null を返す → メッセージは非表示（原文秘匿）
    ↓
  adjustMessage() → Gemini Flash 2.5 → aiText が返ってくる
    ↓
  messages/{messageId}.aiTexts.{myUid} に書き込み
  chats/{chatId}.lastAiMessages.{myUid} に書き込み
    ↓
subscribeToMessages が更新を検知
  → getDisplayText が aiText を返す → メッセージが表示される ✦
    ↓
チャット一覧に戻ったとき
  → lastAiMessages[myUid] あり → AI テキストがプレビューに表示
```

---

## 設定 UI（settings/page.tsx 内）

```
AI テキスト調整
─────────────────────────────────────
受信メッセージをAIで調整する    [トグル]

調整スタイル（AI が OFF のときは非表示）
┌─────────────────────────────────┐
│ 以下のメッセージを、元の意図・  │
│ 内容を保ちながら...             │
└─────────────────────────────────┘

[保存する]
```

- トグルが OFF のとき、テキストエリアは非表示にする
- 「保存する」ボタンで `updateSettings()` を呼び出す
- 設定未作成（`getSettings` が `null`）の場合はデフォルト値をフォームに表示する
- 保存完了後 2 秒間「保存しました」と表示するフィードバックあり

---

## 実装フェーズ

### Phase 1 — Settings 基盤 ✅
- `lib/settings.ts` 実装（`getSettings` / `updateSettings`）
- `settings/page.tsx` に AI 設定セクション追加
- Firestore Security Rules に `settings/{uid}` を追加

### Phase 2 — AI API 接続 & メッセージ処理 ✅
- `app/api/adjust-message/route.ts` 実装（Gemini API プロキシ）
- `lib/ai.ts` 実装（`adjustMessage`）
- `lib/chat.ts` に `updateMessageAiText` / `updateChatLastAiMessage` / `getReadCount` / `getDisplayText` を追加
- `Message` 型に `aiTexts`、`Chat` 型に `lastAiMessages` を追加
- `hooks/useAiProcessing.ts` 実装（未読メッセージの AI 処理・副作用のみ）
- `hooks/useAuth.ts` で settings ロードを統合（`talk/[id]/page.tsx` が `useAuth` 経由で settings を受け取る）
- `talk/page.tsx` に `useAuth` 経由での settings ロードを追加
- `FriendListItem` に `aiEnabled` props 追加・プレビュー表示ロジック更新
- `MessageBubble` に `isAiAdjusted` props 追加（✦ インジケーター）

### Phase 3 — UI 反映 & 体験改善
- エラー時のフォールバック改善（AI 失敗時の通知など）
