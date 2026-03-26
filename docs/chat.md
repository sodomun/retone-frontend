# チャット機能の設計

## 関数一覧（src/lib/chat.ts）

---

## sendMessage

### 概要

メッセージを送信し、チャットドキュメントのサマリーを更新する。

### 処理の流れ

```
1. messages サブコレクションにメッセージを追加（addDoc）
2. chats/{chatId} の lastMessage / lastMessageAt / lastMessageSenderId を更新（setDoc + merge）
```

```typescript
await addDoc(collection(db, "chats", chatId, "messages"), {
  senderUid,
  text,
  createdAt: serverTimestamp(),
});

await setDoc(
  doc(db, "chats", chatId),
  {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderUid,
  },
  { merge: true },
);
```

### なぜ2回書き込むのか

Firestore はコレクションをまたいだクエリが苦手なため、トーク一覧画面（`/talk`）でメッセージ一覧をすべて取得するのは非効率。`chats/{chatId}` に最新情報を持たせておくことで、一覧表示に必要なデータを1ドキュメントの読み取りだけで賄える。

---

## markAsRead

### 概要

チャット画面を開いた時点で、自分の既読タイムスタンプを更新する。

### 処理の流れ

```
1. updateDoc で readBy.[uid] をサーバータイムスタンプで更新
```

```typescript
await updateDoc(doc(db, "chats", chatId), {
  [`readBy.${uid}`]: serverTimestamp(),
});
```

### なぜ updateDoc を使うのか（重要）

`setDoc` + `merge: true` でドット記法のキーを使うと、Firestore はそのキーを**ネストされたフィールドパスではなくリテラルなキー名**として扱う。

```typescript
// ❌ setDoc + merge: true
// Firestore に 'readBy.uid' という名前のフラットなフィールドが作られる
await setDoc(doc, { "readBy.uid": serverTimestamp() }, { merge: true });

// ✅ updateDoc
// readBy: { uid: Timestamp } というネスト構造になる
await updateDoc(doc, { "readBy.uid": serverTimestamp() });
```

`updateDoc` はドット記法を「ネストのパス区切り」として正しく解釈するため、`chat.readBy?.[uid]` でアクセスできる構造になる。

### なぜチャット画面に入った時点で既読にするのか

メッセージを1件ずつ「読んだか」を追跡するのはコストが高い。「チャット画面を開いた = それまでの全メッセージを読んだ」という前提を置くことで、シンプルかつ十分な精度の既読管理が実現できる。

---

### 購読の意味とは？

「購読」= 「変化があったら自動で通知してもらう契約」
なぜ「購読」と呼ぶのか

雑誌の定期購読と同じ比喩です。

雑誌の定期購読：
「毎月新しい号が出たら自動で届けてください」と契約する
→ 解約するまで届き続ける

onSnapshot：
「このデータが変わったら自動で通知してください」と登録する
→ unsubscribe() するまで通知が来続ける

このアプリでは subscribeToMessages・subscribeToChatData・subscribeToFriends
の3つが購読を使っており、Firestore
上のデータが変わると画面が自動で更新される仕組みになっている。

## subscribeToMessages

### 概要

messages サブコレクションをリアルタイム購読し、メッセージ一覧の変化を通知する。

```typescript
const q = query(messagesRef, orderBy("createdAt", "asc"));
return onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map((d) => ({
    id: d.id,
    senderUid: data.senderUid,
    text: data.text,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  }));
  callback(messages);
});
```

### 注意点：createdAt が null になる瞬間がある

`serverTimestamp()` はサーバーが時刻を決める仕組みのため、送信直後は時刻が未確定。Firestore のローカルキャッシュが即座に更新される際、`createdAt` は一時的に `null` になる。これは送信後すぐにサーバーから確定値が返ることで解消される。

---

## subscribeToChatData

### 概要

`chats/{chatId}` ドキュメントをリアルタイム購読し、`lastMessageAt` や `readBy` の変化を通知する。

```typescript
return onSnapshot(doc(db, "chats", chatId), (snap) => {
  callback(
    snap.exists()
      ? (snap.data({ serverTimestamps: "estimate" }) as Chat)
      : null,
  );
});
```

### なぜ `serverTimestamps: "estimate"` を使うのか

`serverTimestamp()` を書き込んだ直後は、サーバーから確定値が返る前にローカルキャッシュが更新される。このとき `snap.data()` はデフォルトで未確定フィールドを `null` で返す。`"estimate"` を指定するとクライアントの現在時刻で補完されるため、一時的に `null` になることを防げる。

---

## 既読判定ロジック

### 各メッセージに既読マークをつける（チャット画面）

```typescript
const partnerReadAtMs = chat?.readBy?.[partnerUid]?.toMillis() ?? 0;

// MessageBubble の isRead に直接渡す
isRead={
  msg.senderUid === user.uid &&
  partnerReadAtMs > 0 &&
  (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs
}
```

**考え方：**

- `partnerReadAtMs`：相手が最後にチャット画面を開いた時刻（ミリ秒）
- 以下の3条件をすべて満たすメッセージに「既読」を表示する
  1. 自分が送ったメッセージ
  2. 相手が一度でもチャットを開いている（`partnerReadAtMs > 0`）
  3. 相手が開いた時刻以前に送ったもの（`createdAt <= partnerReadAtMs`）

**`Infinity` を使う理由：**
`createdAt` が `null`（送信直後で時刻未確定）のメッセージは `Infinity` 扱いにして、条件3を満たさないよう除外する。
