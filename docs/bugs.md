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

## Bug 3：友達削除・グループ退会後に `permission-denied` が発生する

### 症状

- 友達削除またはグループ退会後、コンソールに以下のエラーが出る
  ```
  FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
  ```
- 削除・退会自体は正常に完了している

### 原因

削除・退会の操作によって Firestore ドキュメントが変化し、既存の `onSnapshot` リスナーが発火する。

**友達削除の場合：**
チャットドキュメントが `deleteDoc` で消えると `resource` が `null` になる。
ルール `request.auth.uid in resource.data.members` で `resource.data` へのアクセスが評価エラーとなり `permission-denied` が発生する。

**グループ退会の場合：**
`members` から自分が除外されたドキュメントの更新でリスナーが発火する。
`resource.data.members` に自分が含まれないためルールが `false` を返し `permission-denied` になる。

### 解決方法

**友達削除（メッセージの残存問題も同時に修正）：**
Firestore はドキュメントを削除してもサブコレクションは自動削除されない。1:1チャットの chatId は決定論的（同じ2人なら常に同じID）なため、メッセージを残したまま再度友達になると履歴が復元されてしまう。`writeBatch` でメッセージ・チャット・friends を一括削除するよう修正した。

```typescript
const messagesSnap = await getDocs(collection(db, "chats", chatId, "messages"));
const batch = writeBatch(db);
messagesSnap.docs.forEach((d) => batch.delete(d.ref));
batch.delete(doc(db, "chats", chatId));
batch.delete(doc(db, "users", myUid, "friends", friendUid));
batch.delete(doc(db, "users", friendUid, "friends", myUid));
await batch.commit();
```

**Firestore ルール修正：**
`read` ルールに `resource == null` の場合も許可する条件を追加した。これによりドキュメントが削除された後もリスナーが削除イベントを正常に受け取れる。

```js
// 修正前
allow read, update, delete: if request.auth != null
  && request.auth.uid in resource.data.members;

// 修正後
allow read: if request.auth != null
  && (resource == null || request.auth.uid in resource.data.members);
allow update, delete: if request.auth != null
  && request.auth.uid in resource.data.members;
```

**グループ退会（コード修正）：**
`leaveGroup` 呼び出し前にリスナーを手動解除するよう修正した。

```typescript
unsubscribe(); // 操作前に解除（useChatData が返す関数）
await leaveGroup(chatId, user.uid);
router.replace("/talk");
```

`router.replace` によるアンマウントを待つとリスナー解除が間に合わないため、明示的に先解除している。`unsubscribe` は `useChatData` フックが返す関数で、内部の `unsubscribeRef.current?.()` を呼ぶ。

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
