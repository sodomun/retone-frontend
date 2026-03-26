# コンポーネント設計

## FriendListItem

**ファイル：** `src/components/user/FriendListItem.tsx`

### 概要
トーク一覧画面（`/talk`）に表示される友達1人分のリスト項目。アバター・名前・最新メッセージ・未読インジケーターを表示する。

### 表示内容

```
[アバター] 友達の名前          [青い丸] ← 未読時のみ
           最新メッセージのプレビュー
```

未読のとき：名前と本文が**太字**になり、右端に**青い丸**が表示される。

### 未読判定の仕組み

```typescript
const isUnread = (() => {
  if (!chat?.lastMessageAt) return false;
  const readAtMs = chat.readBy?.[myUid]?.toMillis() ?? 0;
  return chat.lastMessageAt.toMillis() > readAtMs;
})();
```

**判定の考え方：**
```
lastMessageAt（最後にメッセージが来た時刻）
  > readBy[myUid]（自分が最後にチャットを開いた時刻）

→ true  = 最後のメッセージをまだ読んでいない → 未読
→ false = 最後のメッセージを読んでいる → 既読
```

**チャットデータの購読：**
```typescript
useEffect(() => {
  return subscribeToChatData(chatId, setChat);
}, [chatId]);
```

`subscribeToChatData` の `onSnapshot` が Firestore のリアルタイム更新を受け取るたびに `chat` ステートが更新され、`isUnread` が再計算される。

---

## MessageBubble

**ファイル：** `src/components/chat/MessageBubble.tsx`

### 概要
チャット画面（`/talk/[id]`）に表示されるメッセージ1件分のバブル。送受信の向き・既読表示・送信時刻を担う。

### Props

| Prop | 型 | 説明 |
|------|-----|------|
| text | string | メッセージ本文 |
| isMine | boolean | 自分が送ったメッセージかどうか |
| createdAt | Date \| null | 送信時刻 |
| isRead | boolean（省略可） | 既読マークを表示するかどうか |

### 表示の振る舞い

```
自分のメッセージ（isMine = true）
  → 右寄せ・青いバブル
  → isRead = true のとき「既読」テキストを表示

相手のメッセージ（isMine = false）
  → 左寄せ・グレーのバブル
  → 既読表示なし
```

### なぜ自分のメッセージにしか既読を表示しないのか

「既読」とは「相手が自分のメッセージを読んだ」という情報であり、相手のメッセージに対しては意味をなさないため。

### isRead の決まり方

チャット画面（`page.tsx`）で各メッセージに直接判定される：

```typescript
isRead={
  msg.senderUid === user.uid &&
  partnerReadAtMs > 0 &&
  (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
}
```

「自分が送った」かつ「相手が開いた時刻以前に送った」メッセージすべてに `isRead = true` が渡される。相手がチャットを開くと、それ以前に送った自分のメッセージ全件に既読マークが表示される。

---

## ProfileAvatar

**ファイル：** `src/components/user/ProfileAvatar.tsx`

### 概要
ユーザーのアバター。画像は持たず、`displayName` の先頭1文字を丸の中に表示する。

---

## ChatHeader

**ファイル：** `src/components/chat/ChatHeader.tsx`

### 概要
チャット画面上部のヘッダー。相手の `displayName` を表示する。

---

## MessageInput

**ファイル：** `src/components/chat/MessageInput.tsx`

### 概要
メッセージ入力欄と送信ボタン。入力内容を `onSend` コールバック経由で親（チャット画面）に渡す。
