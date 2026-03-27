# Firestore データ構造

## コレクション一覧

```
Firestore
├── users/{uid}                         # ユーザー情報
│   └── friends/{friendUid}             # 友達一覧（サブコレクション）
│
└── chats/{chatId}                      # チャット情報（1:1・グループ共通）
    └── messages/{messageId}            # メッセージ一覧（サブコレクション）
```

---

## users/{uid}

ユーザー登録時に作成される。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| uid | string | Firebase Auth の UID |
| displayName | string | 表示名 |
| createdAt | Timestamp | アカウント作成日時 |

### users/{uid}/friends/{friendUid}

| フィールド | 型 | 説明 |
|-----------|-----|------|
| uid | string | 友達の UID |
| displayName | string | 友達の表示名 |
| addedAt | Timestamp | 追加日時 |

友達追加は**双方向**に書き込む。A が B を追加したとき、A の friends に B、B の friends に A を同時に書き込む。これにより「片方だけ友達」という状態を防いでいる。

---

## chats/{chatId}

1:1チャットとグループチャットを**同一コレクションで管理**する。`type` フィールドで種別を判断する。

### chatId の生成ルール

| 種別 | chatId |
|------|--------|
| 1:1チャット | `getChatId(uid1, uid2)` = 2つの UID をアルファベット順にソートして `_` で結合 |
| グループチャット | Firestore の `addDoc` による自動生成 ID |

```typescript
// 1:1の場合
getChatId("uid_A", "uid_B") // → "uid_A_uid_B"（常に同じIDになる）

// グループの場合
addDoc(collection(db, "chats"), {...}) // → "Xk3mN9..." のようなランダムなID
```

### フィールド説明

| フィールド | 型 | 1:1 | グループ | 説明 |
|-----------|-----|-----|---------|------|
| type | string | `"direct"` | `"group"` | チャット種別 |
| members | string[] | [uid1, uid2] | [uid1, uid2, ...] | 参加者全員の UID |
| memberNames | Map\<string, string\> | あり | あり | uid → displayName の対応表 |
| name | string | なし | あり | グループ名 |
| lastMessage | string | あり | あり | 最後に送られたメッセージ本文 |
| lastMessageAt | Timestamp | あり | あり | 最後にメッセージが送られた時刻 |
| lastMessageSenderId | string | あり | あり | 最後に送信したユーザーの UID |
| readBy | Map\<string, Timestamp\> | あり | あり | 各ユーザーが最後にチャット画面を開いた時刻 |

`memberNames` の例：
```
memberNames: {
  "uid_A": "Alice",
  "uid_B": "Bob",
  "uid_C": "Carol",
}
```

### なぜ memberNames をチャットドキュメントに持つのか

トーク一覧（`/talk`）とチャット画面（`/talk/[id]`）で表示名が必要になるが、その都度 `users/{uid}` を読みに行くと N+1 問題が発生する。`memberNames` をチャットドキュメントに持つことで、追加の読み取りなしに名前を表示できる。

---

## chats/{chatId}/messages/{messageId}

1:1・グループ問わず同じ構造。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| senderUid | string | 送信者の UID |
| text | string | メッセージ本文 |
| createdAt | Timestamp | 送信時刻（サーバータイムスタンプ） |

---

## なぜ readBy はチャットドキュメントに持つのか

### 採用しなかった設計：メッセージごとに既読を持つ

```
messages/{id}/readBy: { uid: true }  // メッセージ1件ごとに既読フラグ
```

この設計では：
- メッセージが増えるほど読み書きが増える
- 「未読メッセージが何件あるか」を調べるにはすべてのメッセージを取得する必要がある
- Firestore の読み取りコストが高くなる

### 採用した設計：チャットドキュメントに最終既読時刻を持つ

```
chats/{chatId}/readBy: { uid: Timestamp }  // ユーザーが最後に読んだ時刻
```

この設計では：
- 未読判定は `lastMessageAt > readBy[myUid]` の1回の比較で済む
- どれだけメッセージが増えても読み取りコストが増えない
- 1:1・グループ問わず同じロジックで動作する

---

## Firestore インデックス

### 複合インデックス（手動作成が必要）

`subscribeToChats` のクエリは `where` と `orderBy` を異なるフィールドに組み合わせるため、複合インデックスが必要。

| コレクション | フィールド1 | フィールド2 | 用途 |
|---|---|---|---|
| chats | members（配列） | lastMessageAt（降順） | トーク一覧の取得・ソート |

初回実行時にブラウザのコンソールにインデックス作成リンクが表示される。そのリンクを開くと Firebase コンソールで自動作成できる。

---

## Security Rules

Firestore Security Rules は PostgreSQL の RLS（Row Level Security）に相当し、クライアントのバグや悪意ある操作があっても DB 側でアクセスを制御する。

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // users
    match /users/{uid} {
      allow read: if request.auth != null;        // 友達検索のため認証済み全員が読み取り可
      allow write: if request.auth.uid == uid;    // 自分のドキュメントのみ書き込み可
    }

    // friends
    match /users/{uid}/friends/{friendUid} {
      allow read: if request.auth.uid == uid;
      // 友達追加は双方向書き込みのため、当事者2人のみ許可
      allow write: if request.auth.uid == uid || request.auth.uid == friendUid;
    }

    // chats（1:1 + グループ共通）
    match /chats/{chatId} {
      // 読み取り・更新・削除: 既存の members に自分が含まれる
      allow read, update, delete: if request.auth != null
        && request.auth.uid in resource.data.members;
      // 新規作成: 作成しようとしている members に自分が含まれる
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.members;

      match /messages/{msgId} {
        // 親チャットの members に自分が含まれるか確認
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.members;
      }
    }

  }
}
```

### なぜ chatId.split("_") から resource.data.members に変えたのか

| | 旧: `chatId.split("_")` | 新: `resource.data.members` |
|---|---|---|
| 1:1チャット | ✅ 動作する | ✅ 動作する |
| グループチャット | ❌ 自動生成IDでは UID が取り出せない | ✅ 動作する |
| コレクションクエリ | ❌ chatId が不定のため評価不可 | ✅ ドキュメントの中身で評価可能 |

### create と update/delete を分ける理由

`resource.data` は**既存ドキュメントのデータ**を指す。新規作成（create）時はドキュメントがまだ存在しないため `resource.data` が使えない。代わりに**書き込もうとしているデータ**を指す `request.resource.data` を使う。

### クライアントコードとの二重保護

設定・プロフィール画面では `currentUser.uid`（Auth 由来）のみを使って Firestore を取得しているため、クライアント側でも他ユーザーのデータを取得できない。Security Rules はその保護をサーバー側で担保する二重防御になっている。
