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
チャット画面（`/talk/[id]`）に表示されるメッセージ1件分のバブル。送受信の向き・既読表示・送信時刻・相手のアバターを担う。

### Props

| Prop | 型 | 説明 |
|------|-----|------|
| text | string | メッセージ本文 |
| isMine | boolean | 自分が送ったメッセージかどうか |
| createdAt | Date \| null | 送信時刻 |
| isRead | boolean（省略可） | 既読マークを表示するかどうか |
| displayName | string（省略可） | 相手の名前（アバター表示に使用） |

### 表示の振る舞い

```
相手のメッセージ（isMine = false）
  [アバター] [グレーのバブル]
  ← 左寄せ。アバターは ProfileAvatar（32px）

自分のメッセージ（isMine = true）
             [青いバブル]
             既読  12:34
  → 右寄せ。isRead = true のとき「既読」テキストを表示
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

### Props

| Prop | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| displayName | string | — | 表示名（先頭1文字を使用） |
| size | number | 40 | 直径（px） |

### 使用箇所
- `FriendListItem`：トーク一覧の各行（40px）
- `MessageBubble`：相手メッセージの左横（32px）
- `settings/page.tsx`：設定画面のプロフィールカード（56px）
- `settings/profile/page.tsx`：プロフィール詳細（80px）
- `AddFriendItem`：友達追加の検索結果

---

## ChatHeader

**ファイル：** `src/components/chat/ChatHeader.tsx`

### 概要
チャット画面上部のヘッダー。戻るボタンと相手の `displayName` を表示する。`position: sticky` で画面上部に固定される。

---

## MessageInput

**ファイル：** `src/components/chat/MessageInput.tsx`

### 概要
メッセージ入力欄と送信ボタン。入力内容を `onSend` コールバック経由で親（チャット画面）に渡す。テキストが空のとき送信ボタンはグレーアウトする。

---

## TalkHeader

**ファイル：** `src/components/talk/TalkHeader.tsx`

### 概要
トーク一覧画面のヘッダー。「トーク」タイトルと「+ 友達追加」ボタンを表示する。`position: sticky` で画面上部に固定される。

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

インラインで書くとモーダルのスタイルコードで `settings/page.tsx` が長くなるため。`LogoutModal` に切り出すことで、設定ページ側のモーダル関連コードは以下の3行のみになる：

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
