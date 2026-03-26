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

### ログイン
```
ユーザー入力
  → Firebase Auth でログイン
  → onAuthStateChanged で認証状態を監視
  → 未ログインなら /login にリダイレクト
```

### 友達追加
```
UID を入力して検索
  → users/{uid} を getDoc で取得
  → addFriend() で双方向に friends サブコレクションへ書き込み
```

### チャット
```
トーク画面（/talk）
  → subscribeToFriends で友達一覧をリアルタイム取得
  → 各友達の chatId を getChatId(myUid, friendUid) で生成
  → FriendListItem が subscribeToChatData で未読を監視

チャット画面（/talk/[id]）
  → subscribeToMessages でメッセージをリアルタイム取得
  → subscribeToChatData で readBy（既読情報）を監視
  → markAsRead で自分の既読タイムスタンプを更新
  → sendMessage でメッセージ送信
```

---

## ディレクトリ構造

```
src/
├── app/                    # ページ（Next.js App Router）
│   ├── login/              # ログインページ
│   ├── signup/             # 新規登録ページ
│   ├── talk/               # トーク一覧ページ
│   │   └── [id]/           # チャットページ（動的ルート）
│   ├── friends/add/        # 友達追加ページ
│   └── settings/           # 設定ページ
│
├── components/             # 再利用可能な UI コンポーネント
│   ├── chat/               # チャット画面専用
│   │   ├── MessageBubble   # 1件のメッセージ表示
│   │   ├── MessageInput    # メッセージ入力欄
│   │   └── ChatHeader      # チャット上部ヘッダー
│   ├── user/               # ユーザー関連
│   │   ├── FriendListItem  # 友達一覧の1行
│   │   ├── AddFriendItem   # 友達追加の検索結果1行
│   │   └── ProfileAvatar   # アバター（名前の頭文字）
│   ├── talk/               # トーク画面専用
│   │   └── TalkHeader
│   └── common/
│       └── Footer
│
└── lib/                    # Firebase 操作・ビジネスロジック
    ├── firebase.ts         # Firebase 初期化
    ├── chat.ts             # チャット関連の関数・型
    └── friends.ts          # 友達関連の関数・型
```

### 設計の意図
- `app/` はページのみ。データ取得ロジックは `lib/` に集約することで、画面とロジックを分離している
- `components/` はページをまたいで再利用できる単位で分割
