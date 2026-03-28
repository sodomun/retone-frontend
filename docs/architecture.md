# アーキテクチャ概要

## アプリ全体構成

| 技術 | 用途 |
|------|------|
| Next.js (App Router) | フロントエンド・ルーティング |
| Firebase Auth | ユーザー認証（メール/パスワード） |
| Firestore | リアルタイムデータベース |

サーバーサイドのロジックは持たず、クライアントから Firestore に直接読み書きするシンプルな構成。

---

## データの流れ

### ログイン / サインアップ
```
ユーザー入力
  → Firebase Auth でログイン / アカウント作成
  → サインアップ時は users/{uid} を Firestore に作成
  → onAuthStateChanged で認証状態を監視
  → 未ログインなら /login にリダイレクト
```

### 友達追加
```
UID を入力して検索
  → users/{uid} を getDoc で取得
  → addFriend() で双方向に friends サブコレクションへ書き込み
  → 同時に chats/{chatId} を事前作成（type, members, memberNames, lastMessageAt を設定）
```

### トーク一覧
```
/talk
  → subscribeToChats(user.uid) で自分が参加している全チャットを購読
    （where("members", "array-contains", uid) + orderBy("lastMessageAt", "desc")）
  → 1:1・グループ問わず lastMessageAt 降順で表示
  → 未読判定: lastMessageAt > readBy[myUid]
```

### チャット（1:1 / グループ共通）
```
/talk/[chatId]  ← URLパラメータは常に chatId（friendUid ではない）
  → subscribeToMessages でメッセージをリアルタイム取得
  → subscribeToChatData で chat.type / memberNames / readBy を監視
  → markAsRead で自分の既読タイムスタンプを更新
  → sendMessage でメッセージ送信

1:1の場合: memberNames[partnerUid] でヘッダーの名前を取得
グループの場合: chat.name でヘッダーの名前を取得、既読n（既読人数）を表示
```

### グループ作成
```
/talk/new-group（友達選択）
  → subscribeToFriends で友達一覧を取得
  → チェックボックスで複数選択
  → 「次へ」→ /talk/new-group/profile?members=uid1,uid2

/talk/new-group/profile（グループプロフィール設定）
  → URLパラメータの members を分割して各ユーザーの displayName を getDoc で取得
  → グループ名を入力
  → 「作成」→ createGroupChat() → /talk/{chatId} にリダイレクト
```

### プロフィール・友達削除・グループ退会
```
/talk/[chatId]/profile（チャット相手 or グループのプロフィール）
  → ChatHeader の ProfileAvatar をタップで遷移
  → subscribeToChatData で chat.type を取得

1:1の場合:
  → 相手の名前・アバターを表示
  → 「友達を削除する」→ deleteFriend()
    - users/{myUid}/friends/{partnerUid} を deleteDoc
    - users/{partnerUid}/friends/{myUid} を deleteDoc（双方向削除）
    - chats/{chatId} を deleteDoc
  → /talk にリダイレクト

グループの場合:
  → グループ名・アバター・メンバー数を表示
  → 「グループに友達追加」→ /talk/{chatId}/add-member に遷移
  → 「退会する」→ leaveGroup()
    - members から自分の UID を arrayRemove
    - memberNames から自分のエントリを deleteField
    - 残りメンバーが 0 人なら chats/{chatId} ごと deleteDoc
  → /talk にリダイレクト

グループへの友達追加:
  /talk/{chatId}/add-member
  → subscribeToFriends で友達一覧を取得
  → subscribeToChats で各友達の 1:1 チャット情報を取得（lastMessageAt ソート用）
  → chat.members に含まれない友達のみ表示（lastMessageAt 降順）
  → トグルで複数選択 → 「追加」→ addMembersToGroup()
    - members に arrayUnion で新メンバーを追加
    - memberNames に新メンバーの displayName を追加
  → /talk/{chatId} にリダイレクト
```

### 設定
```
設定画面（/settings）
  → onAuthStateChanged で currentUser を取得
  → users/{currentUser.uid} を getDoc で取得（URLパラメータは使わない）
  → displayName・email を表示
  → ログアウトボタン → LogoutModal → signOut(auth)
    → onAuthStateChanged が null で発火 → /login にリダイレクト

プロフィール画面（/settings/profile）
  → 同様に currentUser.uid でのみ取得
  → displayName / email / uid / createdAt を表示
```

### AI 設定
```
設定画面（/settings）内のAI設定セクション
  → getSettings(uid) で settings/{uid} を取得
  → aiEnabled トグルと systemPrompt テキストエリアを表示
  → 変更時 → updateSettings(uid, { aiEnabled, systemPrompt })
    → settings/{uid} を setDoc（ドキュメントが存在しない場合は作成）
```

### AI テキスト処理（受信者側・チャット画面）
```
チャット画面（/talk/[chatId]）を開く
  → subscribeToMessages でメッセージ一覧を取得
  → getSettings(uid) で自分のAI設定を取得
  → aiEnabled: true の場合：
      自分が受信者（senderUid !== myUid）のメッセージに対して：
        aiTexts[myUid] が未生成なら：
          adjustMessage(text, systemPrompt) → Gemini Flash 2.5 で調整
          updateMessageAiText(chatId, messageId, myUid, aiText) で Firestore に保存
  → MessageBubble に渡すテキストの決定：
      isMine = true  → text（元テキスト）
      isMine = false → aiTexts[myUid] があればそれ、なければ text
```

---

## ディレクトリ構造

```
src/
├── app/                    # ページ（Next.js App Router）
│   ├── login/              # ログインページ
│   ├── signup/             # 新規登録ページ
│   ├── talk/               # トーク一覧ページ
│   │   ├── [id]/           # チャットページ（chatId が動的パラメータ）
│   │   │   ├── profile/    # チャット相手 or グループのプロフィールページ
│   │   │   └── add-member/ # グループへの友達追加ページ
│   │   └── new-group/      # グループ作成：友達選択
│   │       └── profile/    # グループ作成：プロフィール設定
│   ├── friends/add/        # 友達追加ページ
│   └── settings/           # 設定ページ
│       └── profile/        # プロフィール詳細ページ
│
├── components/             # 再利用可能な UI コンポーネント
│   ├── chat/               # チャット画面専用
│   │   ├── MessageBubble   # 1件のメッセージ表示
│   │   ├── MessageInput    # メッセージ入力欄
│   │   └── ChatHeader      # チャット上部ヘッダー（ProfileAvatar タップでプロフィールへ遷移）
│   ├── user/               # ユーザー関連
│   │   ├── FriendListItem  # トーク一覧の1行（1:1・グループ共通）
│   │   ├── AddFriendItem   # 友達追加の検索結果1行
│   │   └── ProfileAvatar   # アバター（名前の頭文字）
│   ├── talk/               # トーク画面専用
│   │   └── TalkHeader      # トーク一覧ヘッダー（友達追加・グループ作成ボタン）
│   └── common/             # 複数画面で共有
│       ├── Footer          # ボトムナビゲーション（トーク / 設定）
│       └── LogoutModal     # ログアウト確認モーダル
│
└── lib/                    # Firebase 操作・ビジネスロジック
    ├── firebase.ts         # Firebase 初期化
    ├── chat.ts             # チャット関連の関数・型
    ├── friends.ts          # 友達関連の関数・型（友達削除含む）
    ├── group.ts            # グループ関連の関数（グループ退会）
    ├── settings.ts         # AI設定の取得・更新（settings コレクション）
    └── ai.ts               # Gemini Flash 2.5 API 呼び出し（テキスト調整）
```

### 設計の意図
- `app/` はページのみ。データ取得ロジックは `lib/` に集約することで、画面とロジックを分離している
- `components/` はページをまたいで再利用できる単位で分割
- `common/` は特定のドメインに依存しない汎用コンポーネントを置く

---

## セキュリティ設計

### 認証 UID によるデータ取得の保護

設定・プロフィール画面では **URLパラメータを使わず、`onAuthStateChanged` で得た `currentUser.uid` のみ** を Firestore クエリに使う。

```
❌ /settings/[id] → URLの id をそのまま getDoc に使う → URL改ざんで他人のデータを取得できる
✅ /settings      → currentUser.uid を使う           → 自分のデータしか取得できない
```

### チャットのアクセス制御

旧設計では `chatId.split("_")` でアクセス制御していたが、グループチャットの chatId は Firestore 自動生成 ID のためこの方法は使えない。

```
❌ 旧: chatId.split("_") に UID が含まれるか → グループの自動生成 ID では機能しない
                                              → コレクションクエリでは評価不可
✅ 新: resource.data.members に UID が含まれるか → 1:1・グループ共通で機能
                                                  → コレクションクエリでも評価可能
```

Firestore Security Rules でも同様のルールを二重に適用することで、クライアントのバグがあっても DB 側で防御できる（PostgreSQL の RLS 相当）。
