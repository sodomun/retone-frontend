# コンポーネント設計

## FriendListItem

**ファイル：** `src/components/user/FriendListItem.tsx`

### 概要
トーク一覧画面（`/talk`）に表示されるチャット1件分のリスト項目。1:1・グループ共通で使用する。アバター・名前・最新メッセージ・未読インジケーターを表示する。

### Props

| Prop | 型 | 説明 |
|------|-----|------|
| displayName | string | 表示名（1:1は相手の名前、グループはグループ名） |
| myUid | string | 自分の UID（未読判定に使用） |
| chat | Chat \| null | チャットデータ（親から渡される） |
| isGroup | boolean（省略可） | グループチャットかどうか（デフォルト false） |
| onClick | () => void（省略可） | タップ時の処理 |

### 表示内容

```
1:1チャット:
[ProfileAvatar] 相手の名前          [青い丸] ← 未読時のみ
                最新メッセージのプレビュー

グループチャット:
[👥アイコン]   グループ名           [青い丸] ← 未読時のみ
                最新メッセージのプレビュー
```

### 未読判定の仕組み

```typescript
const isUnread = (() => {
  if (!chat?.lastMessageAt) return false;
  const readAtMs = chat.readBy?.[myUid]?.toMillis() ?? 0;
  return chat.lastMessageAt.toMillis() > readAtMs;
})();
```

```
lastMessageAt（最後にメッセージが来た時刻）
  > readBy[myUid]（自分が最後にチャットを開いた時刻）

→ true  = まだ読んでいない → 未読
→ false = 読んでいる → 既読
```

### chat を props で受け取る理由

以前は `FriendListItem` 内で `subscribeToChatData` を呼んでいたが、それだと親（`talk/page.tsx`）がソートに必要な `lastMessageAt` を知ることができず、かつ Firestore の読み取りが二重になっていた。

`talk/page.tsx` で全チャットを一括購読（`subscribeToChats`）し、各 `FriendListItem` には結果を props として渡すことで：
- ソートを親が管理できる
- Firestore の読み取りが重複しない

---

## MessageBubble

**ファイル：** `src/components/chat/MessageBubble.tsx`

### 概要
チャット画面（`/talk/[id]`）に表示されるメッセージ1件分のバブル。送受信の向き・既読表示・送信時刻・送信者のアバターを担う。1:1・グループ共通で使用できる。

### Props

| Prop | 型 | 説明 |
|------|-----|------|
| text | string | メッセージ本文 |
| isMine | boolean | 自分が送ったメッセージかどうか |
| createdAt | Date \| null | 送信時刻 |
| isRead | boolean（省略可） | 既読マークを表示するかどうか（1:1のみ） |
| displayName | string（省略可） | 送信者の名前（`chat.memberNames[msg.senderUid]` から取得） |

### 表示の振る舞い

```
相手のメッセージ（isMine = false）
  [アバター] [グレーのバブル]
  ← 左寄せ。アバターは ProfileAvatar（32px）
  グループでは送信者ごとに異なる名前のアバターが表示される

自分のメッセージ（isMine = true）
             [青いバブル]
             既読  12:34
  → 右寄せ。isRead = true のとき「既読」テキストを表示（1:1のみ）
```

### なぜ自分のメッセージにしか既読を表示しないのか

「既読」とは「相手が自分のメッセージを読んだ」という情報であり、相手のメッセージに対しては意味をなさないため。またグループチャットでは複数人の既読状態を1つの表示にまとめることが複雑なため、現状は非表示としている。

---

## ProfileAvatar

**ファイル：** `src/components/user/ProfileAvatar.tsx`

### 概要
ユーザーのアバター。画像は持たず、`displayName` の先頭1文字を丸の中に表示する。

### Props

| Prop | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| displayName | string | — | 表示名（先頭1文字を使用） |
| size | number | 40 | 直径（px） |

### 使用箇所
- `FriendListItem`：トーク一覧の各行（40px）、1:1チャットのみ
- `MessageBubble`：相手メッセージの左横（32px）
- `settings/page.tsx`：設定画面のプロフィールカード（56px）
- `settings/profile/page.tsx`：プロフィール詳細（80px）
- `AddFriendItem`：友達追加の検索結果
- `talk/new-group/page.tsx`：グループ作成の友達選択画面
- `talk/new-group/profile/page.tsx`：グループプロフィール設定のメンバー一覧（48px）

---

## ChatHeader

**ファイル：** `src/components/chat/ChatHeader.tsx`

### 概要
チャット画面上部のヘッダー。戻るボタンと `displayName` を表示する。`position: sticky` で画面上部に固定される。1:1では相手の名前、グループではグループ名が渡される。

---

## MessageInput

**ファイル：** `src/components/chat/MessageInput.tsx`

### 概要
メッセージ入力欄と送信ボタン。入力内容を `onSend` コールバック経由で親（チャット画面）に渡す。テキストが空のとき送信ボタンはグレーアウトする。

---

## TalkHeader

**ファイル：** `src/components/talk/TalkHeader.tsx`

### 概要
トーク一覧画面のヘッダー。「グループ作成」ボタンと「+ 友達追加」ボタンを表示する。`position: sticky` で画面上部に固定される。

| ボタン | 遷移先 | スタイル |
|---|---|---|
| グループ作成 | `/talk/new-group` | 青枠・白背景 |
| + 友達追加 | `/friends/add` | 青背景・白文字 |

---

## Footer

**ファイル：** `src/components/common/Footer.tsx`

### 概要
トーク一覧（`/talk`）・設定（`/settings`）画面のボトムナビゲーション。現在のパスに応じてアクティブなタブをハイライトする。

### タブ構成

| タブ | パス | アイコン |
|------|------|---------|
| トーク | /talk | 💬 |
| 設定 | /settings | ⚙️ |

### アクティブ判定

```typescript
const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
```

`/talk/someId` のようなサブパスでも、トークタブがアクティブになる。

---

## LogoutModal

**ファイル：** `src/components/common/LogoutModal.tsx`

### 概要
ログアウト確認のモーダルダイアログ。設定画面（`/settings`）の「ログアウト」ボタンから表示される。

### Props

| Prop | 型 | 説明 |
|------|-----|------|
| onCancel | () => void | キャンセルボタンを押したときの処理 |
| onConfirm | () => void | ログアウトボタンを押したときの処理 |

### 構造

```
[暗い透過オーバーレイ] ← クリックしても何もしない
[モーダル本体]
  ログアウト
  ログアウトしますか？
  [キャンセル]  [ログアウト（赤）]
```

オーバーレイと本体を `position: fixed` で重ねて表示する。`zIndex` はオーバーレイが 100、本体が 101。

### ログアウトの流れ

```
OKボタン押下
  → onConfirm() → signOut(auth)
  → onAuthStateChanged が currentUser=null で発火
  → router.replace("/login") でリダイレクト
```

### なぜコンポーネントに分離したか

インラインで書くとモーダルのスタイルコードで `settings/page.tsx` が長くなるため。`LogoutModal` に切り出すことで、設定ページ側のモーダル関連コードは3行のみになる。

```tsx
{showLogoutModal && (
  <LogoutModal
    onCancel={() => setShowLogoutModal(false)}
    onConfirm={handleLogout}
  />
)}
```

### パラレル/インターセプトルートを使わない理由

Next.js のパラレル/インターセプトルートはモーダルに独自の URL を持たせる用途（例：画像ライトボックス）に向いている。ログアウト確認は URL 不要の単純なダイアログのため、コンポーネント分離で十分。
