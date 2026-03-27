# Firestore データ構造

## コレクション一覧

```
Firestore
├── users/{uid}                         # ユーザー情報
│   └── friends/{friendUid}             # 友達一覧（サブコレクション）
│
└── chats/{chatId}                      # チャット情報
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

2人のチャットを管理するドキュメント。

### chatId の生成ルール

```typescript
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}
// 例: "2MCtvOJ..._aQVpxKN..." （アルファベット順でソート）
```

どちらのユーザーが `getChatId` を呼んでも必ず同じ ID になるため、チャットドキュメントが重複しない。

### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| lastMessage | string | 最後に送られたメッセージ本文 |
| lastMessageAt | Timestamp | 最後にメッセージが送られた時刻 |
| lastMessageSenderId | string | 最後に送信したユーザーの UID |
| readBy | Map\<string, Timestamp\> | 各ユーザーが最後にチャット画面を開いた時刻 |

`readBy` の例：
```
readBy: {
  "2MCtvOJ8m7gbKiesrjDOft7iV1z1": Timestamp(20:53:44),
  "aQVpxKNx80geJRnkOLz2xDtgoNm1": Timestamp(21:04:49),
}
```

---

## chats/{chatId}/messages/{messageId}

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
- 「既読」の概念を「最後にチャット画面を開いた時刻以前のメッセージはすべて既読」と定義することで十分に機能する

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
      // 友達追加は双方向書き込みのため、当事者2人（uid本人 または friendUid本人）のみ許可
      allow write: if request.auth.uid == uid || request.auth.uid == friendUid;
    }

    // chats
    match /chats/{chatId} {
      allow read, write: if request.auth != null
        && request.auth.uid in chatId.split("_");

      match /messages/{msgId} {
        allow read, write: if request.auth != null
          && request.auth.uid in chatId.split("_");
      }
    }

  }
}
```

### 各ルールの意図

| コレクション | read | write |
|---|---|---|
| users | 認証済み全員（友達検索に必要） | 自分のドキュメントのみ |
| friends | 自分のサブコレクションのみ | 自分または相手（双方向追加のため） |
| chats / messages | chatId に UID が含まれる2人のみ | 同左 |

### クライアントコードとの二重保護

設定・プロフィール画面では `currentUser.uid`（Auth 由来）のみを使って Firestore を取得しているため、クライアント側でも他ユーザーのデータを取得できない。Security Rules はその保護をサーバー側で担保する二重防御になっている。
