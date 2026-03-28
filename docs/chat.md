# チャット機能の設計

## 関数一覧
- チャット関連: `src/lib/chat.ts`（sendMessage, markAsRead, subscribeToMessages, subscribeToChatData, subscribeToChats, createGroupChat, addMembersToGroup）
- 友達関連: `src/lib/friends.ts`（addFriend, deleteFriend, subscribeToFriends）
- グループ関連: `src/lib/group.ts`（leaveGroup）

---

## sendMessage

### 概要

メッセージを送信し、チャットドキュメントのサマリーを更新する。1:1・グループ共通で使用できる。

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

## 購読の意味とは？

「購読」= 「変化があったら自動で通知してもらう契約」

雑誌の定期購読と同じ比喩。

```
雑誌の定期購読：「毎月新しい号が出たら自動で届けてください」と契約する
              → 解約するまで届き続ける

onSnapshot：  「このデータが変わったら自動で通知してください」と登録する
              → unsubscribe() するまで通知が来続ける
```

このアプリでは `subscribeToMessages`・`subscribeToChatData`・`subscribeToChats` が購読を使っており、Firestore 上のデータが変わると画面が自動で更新される仕組みになっている。

---

## subscribeToChats

### 概要

自分が参加している**全チャット**（1:1・グループ共通）を `lastMessageAt` 降順でリアルタイム購読する。`talk/page.tsx` のトーク一覧で使用する。

```typescript
const q = query(
  collection(db, "chats"),
  where("members", "array-contains", uid),
  orderBy("lastMessageAt", "desc")
);
return onSnapshot(q, (snapshot) => {
  const chats = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data({ serverTimestamps: "estimate" }) as Chat),
  }));
  callback(chats);
});
```

### なぜ友達リストからではなくチャットコレクションを直接クエリするのか

旧設計では `subscribeToFriends` → 各 chatId を計算 → 各チャットを個別購読という流れだった。この設計ではグループチャットに対応できない（friendsサブコレクションに友達として登録されていないため）。

`chats` コレクションを `members` フィールドで直接クエリすることで、1:1・グループを問わず自分が参加している全チャットを一括取得できる。

### 複合インデックスが必要な理由

`where("members", "array-contains", uid)` と `orderBy("lastMessageAt", "desc")` は**異なるフィールドへの操作**を組み合わせている。Firestore はこの組み合わせのために事前に複合インデックスを作成しておく必要がある。

インデックスなしの場合：全ドキュメントをスキャンして絞り込み・ソート → ドキュメント数に比例して遅くなる
インデックスありの場合：`members` × `lastMessageAt` の組み合わせ表が事前に用意されているため直接ジャンプできる

---

## subscribeToMessages

### 概要

messages サブコレクションをリアルタイム購読し、メッセージ一覧の変化を通知する。1:1・グループ共通で使用できる。

```typescript
const q = query(messagesRef, orderBy("createdAt", "asc"));
return onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map((d) => ({
    id: d.id,
    senderUid: data.senderUid,
    text: data.text,
    aiTexts: data.aiTexts ?? {},   // 受信者UID → AI調整テキストのマップ
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  }));
  callback(messages);
});
```

### Message 型

```typescript
type Message = {
  id: string;
  senderUid: string;
  text: string;                          // 元のメッセージ本文
  aiTexts: { [uid: string]: string };    // 受信者ごとのAI調整済みテキスト
  createdAt: Date | null;
};
```

### 注意点：createdAt が null になる瞬間がある

`serverTimestamp()` はサーバーが時刻を決める仕組みのため、送信直後は時刻が未確定。Firestore のローカルキャッシュが即座に更新される際、`createdAt` は一時的に `null` になる。これは送信後すぐにサーバーから確定値が返ることで解消される。

---

## subscribeToChatData

### 概要

`chats/{chatId}` ドキュメントをリアルタイム購読し、`type` / `memberNames` / `readBy` などの変化を通知する。チャット画面（`/talk/[id]`）で使用する。

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

## createGroupChat

### 概要

グループチャットドキュメントを作成し、生成された chatId を返す。`/talk/new-group/profile` の「作成」ボタンから呼ばれる。

```typescript
const ref = await addDoc(collection(db, "chats"), {
  type: "group",
  members,       // 全メンバーの UID 配列（自分含む）
  memberNames,   // uid → displayName のマップ
  name: groupName,
  lastMessageAt: serverTimestamp(),
});
return ref.id;
```

1:1チャットと異なり、`addDoc` で Firestore が自動生成した ID を chatId として使う。

---

## addMembersToGroup

### 概要

既存のグループに新メンバーを追加する。`talk/[id]/add-member/page.tsx` の「追加」ボタンから呼ばれる。

```typescript
await updateDoc(doc(db, "chats", chatId), {
  members: arrayUnion(...newUids),         // 配列に新メンバーを追加（重複なし）
  ...Object.fromEntries(
    newUids.map((uid) => [`memberNames.${uid}`, newMemberNames[uid]])
  ),                                        // memberNames に新メンバーの表示名を追加
});
```

- `arrayUnion` により既存メンバーを変更せず新メンバーのみ追加される
- `memberNames` はドット記法で個別フィールドとして更新されるため、既存メンバーの名前は上書きされない

---

## deleteFriend

### 概要

友達を双方向で削除し、1:1チャットドキュメントも削除する。`talk/[id]/profile/page.tsx` の「友達を削除する」ボタンから呼ばれる。`src/lib/friends.ts` に定義。

```typescript
await Promise.all([
  deleteDoc(doc(db, "users", myUid, "friends", friendUid)),
  deleteDoc(doc(db, "users", friendUid, "friends", myUid)), // 相手側も削除
  deleteDoc(doc(db, "chats", getChatId(myUid, friendUid))),
]);
```

- `addFriend` が双方向に書き込むのと対称的に、双方向で削除する
- Firestore はドキュメントを削除してもサブコレクションは自動削除されない。1:1チャットの chatId は決定論的（同じ2人なら常に同じID）なため、メッセージを残したまま再度友達になると履歴が復元されてしまう。これを防ぐため `messages` サブコレクションも明示的に削除している
- `writeBatch` でメッセージ削除・チャット削除・friends 削除をまとめてアトミックに実行する

---

## leaveGroup

### 概要

グループチャットから退会する。`talk/[id]/profile/page.tsx` の「退会する」ボタンから呼ばれる。`src/lib/group.ts` に定義。

```typescript
const remaining = members.filter((uid) => uid !== myUid);

if (remaining.length === 0) {
  await deleteDoc(chatRef); // 最後の1人なら解散
} else {
  await updateDoc(chatRef, {
    members: arrayRemove(myUid),
    [`memberNames.${myUid}`]: deleteField(),
  });
}
```

- `members` 配列から自分の UID を除去
- `memberNames` マップから自分のエントリを削除
- 退会後に残りメンバーが 0 人になる場合はグループ自体を `deleteDoc` で解散する

### なぜ退会前にリスナーを手動解除するのか

`leaveGroup` でメンバーから自分が除外されると、`subscribeToChatData` のスナップショットが発火する。このとき `resource.data.members` に自分がいないため Firestore ルールで `permission-denied` になる。

`router.replace("/talk")` によるコンポーネントのアンマウントはその後に行われるため、先にリスナーを手動解除することでエラーを防いでいる。

```typescript
unsubscribeChatRef.current?.(); // 先に解除
await leaveGroup(chatId, user.uid);
router.replace("/talk");
```

---

## 既読判定ロジック

### 各メッセージに既読人数をつける（チャット画面）

`readCount` として既読人数を計算し `MessageBubble` に渡す。1:1では 0 or 1、グループでは 0〜n。

```typescript
const getReadCount = (msg: Message): number => {
  if (msg.senderUid !== user.uid) return 0; // 自分のメッセージのみ対象

  if (!isGroup) {
    // 1:1: 相手の readBy タイムスタンプとメッセージの createdAt を比較
    return partnerReadAtMs > 0 &&
      (msg.createdAt?.getTime() ?? Infinity) <= partnerReadAtMs ? 1 : 0;
  }

  // グループ: 自分以外のメンバーで readBy >= createdAt を満たす人数
  const msgTimeMs = msg.createdAt?.getTime();
  if (msgTimeMs == null) return 0;

  return (chat?.members ?? [])
    .filter((uid) => uid !== user.uid)
    .filter((uid) => {
      const readAtMs = chat?.readBy?.[uid]?.toMillis();
      return readAtMs != null && readAtMs >= msgTimeMs;
    }).length;
};
```

**考え方：**

- `readBy[uid]`：各ユーザーが最後にチャット画面を開いた時刻
- あるメッセージを「読んだ」= `readBy[uid] >= msg.createdAt`
- 1:1は相手1人だけ、グループは自分以外の全メンバーを対象にカウント

**`Infinity` を使う理由：**
`createdAt` が `null`（送信直後で時刻未確定）のメッセージは `Infinity` 扱いにして、既読条件を満たさないよう除外する。

### MessageBubble での表示

| 状況 | readCount | 表示 |
|---|---|---|
| 1:1・未読 | 0 | 非表示 |
| 1:1・既読 | 1 | 「既読」 |
| グループ・誰も未読 | 0 | 非表示 |
| グループ・3人既読 | 3 | 「既読3」 |
