# バグ記録

## Bug 1：`setDoc` + `merge: true` でドット記法を使うと readBy がフラットなキーになる

### 症状
- チャット画面を開いても「既読」マークが表示されない
- トーク一覧の青い未読バッジが消えない
- Firestore コンソールでは `readBy` のタイムスタンプは正しく保存されている

### 原因

`markAsRead` で以下のコードを使っていた：

```typescript
// ❌ 問題のあったコード
await setDoc(
  doc(db, "chats", chatId),
  { [`readBy.${uid}`]: serverTimestamp() },
  { merge: true }
);
```

`setDoc` は `merge: true` を付けても、ドット記法のキー（`readBy.uid`）を**ネストされたフィールドパスではなくリテラルなキー名**として扱う。

その結果、Firestore に以下のようなフラット構造で保存された：

```javascript
// 保存された構造（フラット）
{
  'readBy.aQVpxKNx80geJRnkOLz2xDtgoNm1': Timestamp,  // ← ドットがキー名の一部
  'readBy.2MCtvOJ8m7gbKiesrjDOft7iV1z1': Timestamp,
  lastMessageAt: Timestamp,
}

// 期待していた構造（ネスト）
{
  readBy: {
    'aQVpxKNx80geJRnkOLz2xDtgoNm1': Timestamp,
    '2MCtvOJ8m7gbKiesrjDOft7iV1z1': Timestamp,
  },
  lastMessageAt: Timestamp,
}
```

コード上で `chat.readBy?.[myUid]` にアクセスしても、`chat.readBy` は `undefined` になるためタイムスタンプを取得できず、既読判定が常に失敗していた。

### デバッグで判明したこと

`FriendListItem` の `isUnread` 計算内に `console.log` を仕込んだところ：

```
chat: { 'readBy.aQVpxKNx80...': Timestamp, ... }
readBy: undefined     ← フラットキーのため chat.readBy が undefined
readAtMs: 0           ← ?? 0 にフォールバック
```

Firestore コンソールには値が存在しているのに `readBy` が `undefined` になっていた点が手がかりだった。

### 解決方法

`updateDoc` に変更した。`updateDoc` はドット記法を**ネストのパス区切り**として正しく解釈する。

```typescript
// ✅ 修正後
await updateDoc(
  doc(db, "chats", chatId),
  { [`readBy.${uid}`]: serverTimestamp() }
);
```

| | `setDoc` + `merge: true` | `updateDoc` |
|---|---|---|
| ドット記法の解釈 | リテラルなキー名 | ネストのパス |
| 結果 | `{ 'readBy.uid': T }` | `{ readBy: { uid: T } }` |
| ドキュメント未存在時 | 新規作成 | エラー |

### 注意点
- `updateDoc` はドキュメントが存在しない場合エラーになる
- `markAsRead` はメッセージが届いた後（＝チャットドキュメントが存在する状態）にのみ呼ばれるため、実用上は問題ない
- 修正前に書き込まれた古いフラットキー（`readBy.uid` という名前のフィールド）は Firestore コンソールから手動削除が必要

---

## Bug 2：`serverTimestamp()` のペンディング状態で値が `null` になる

### 症状
- メッセージ送信直後、一瞬だけ `createdAt` が `null` になる
- `markAsRead` 直後に `readBy` の値が取得できない場合がある

### 原因

`serverTimestamp()` はサーバーが時刻を決める仕組みのため、書き込み直後はサーバーから確定値が返るまでの間、ローカルキャッシュ上では値が未確定になる。

Firestore の `onSnapshot` はローカルキャッシュの変更に即座に反応するため、未確定状態のスナップショットが先に届く。

このとき `snap.data()` のデフォルト動作（`serverTimestamps: 'none'`）は、未確定の `serverTimestamp` フィールドを `null` で返す。

### 解決方法

`subscribeToChatData` で `snap.data()` のオプションに `serverTimestamps: 'estimate'` を指定した：

```typescript
callback(snap.exists()
  ? (snap.data({ serverTimestamps: "estimate" }) as Chat)
  : null);
```

`'estimate'` を指定すると、未確定の `serverTimestamp` フィールドをクライアントの現在時刻で補完して返す。確定済みのフィールドには影響しない。

| オプション | 未確定フィールドの扱い |
|-----------|----------------------|
| `'none'`（デフォルト） | `null` を返す |
| `'estimate'` | クライアント時刻で補完 |
| `'previous'` | 直前の確定値を返す |
